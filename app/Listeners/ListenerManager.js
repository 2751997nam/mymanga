"use strict";
const Helpers = use("Helpers");
const dir = Helpers.appRoot() + "/app";
const Util = use("App/Utils/util");
var amqp = require("amqplib/callback_api");
const Config = use("Config");

class ListenerManager {
    async init() {
        this.implDir = dir + "/Listeners/impl";
        const connection = await this.createConnection();
        const channel = await this.createChannel(connection);
        var exchange = Config.get("crawl.queueName");
        channel.assertExchange(exchange, "fanout", {
            durable: true,
        });
        channel.assertQueue(exchange, {
            durable: true,
        });
        channel.prefetch(1);

        channel.consume(exchange, (msg) => {
            if (msg.content) {
                let data = JSON.parse(msg.content.toString());
                console.log("reviced", data);
                if (data.listener) {
                    const crawler = this.loadCrawlers(
                        this.implDir + "/" + data.listener
                    );
                    crawler.init(data.data);
                }
            }
            channel.ack(msg);
        });
    }

    createConnection() {
        return new Promise((resolve, reject) => {
            amqp.connect("amqp://localhost", function (error, connection) {
                if (error) {
                    reject(error);
                } else {
                    resolve(connection);
                }
            });
        });
    }

    createChannel(connection) {
        return new Promise((resolve, reject) => {
            connection.createChannel(function (error, channel) {
                if (error) {
                    reject(error);
                } else {
                    resolve(channel);
                }
            });
        });
    }

    assertQueue(channel, queue) {
        return new Promise((resolve, reject) => {
            channel.assertQueue(
                queue,
                {
                    durable: true,
                },
                function (error, q) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(q);
                    }
                }
            );
        });
    }

    loadCrawlers(dir) {
        var crawler = new (require(dir))();
        return crawler;
    }
}

module.exports = new ListenerManager();
