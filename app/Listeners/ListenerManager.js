"use strict";
const Helpers = use("Helpers");
const dir = Helpers.appRoot() + "/app";
const Util = use("App/Utils/util");
var amqp = require("amqplib/callback_api");
const Config = use("Config");
var RateLimiter = require('limiter').RateLimiter;
var subLimiter = new RateLimiter(1, 2000);

class ListenerManager {
    async init() {
        this.implDir = dir + "/Listeners/impl";
        const connection = await this.createConnection();
        console.log('created connection');
        const channel = await this.createChannel(connection);
        var exchange = Config.get("crawl.queueName");
        channel.assertExchange(exchange, "fanout", {
            durable: false
        });
        this.channel = channel;
        this.connection = connection;
        this.exchange = exchange;

        for (let i = 0; i < Config.get('crawl.consumers'); i++) {
            this.consume();
        }
    }

    async consume() {
        this.channel.assertQueue(this.exchange, {
            exclusive: true
        });
        this.channel.prefetch(1);

        this.channel.consume(this.exchange, (msg) => {
            subLimiter.removeTokens(1, async (err, remainingRequests) => {
                if (msg.content) {
                    global.COUNT++;
                    console.log('COUNT: ', global.COUNT);
                    let data = JSON.parse(msg.content.toString());
                    console.log("reveived", data);
                    if (data.listener) {
                        const listener = this.loadListeners(
                            this.implDir + "/" + data.listener
                        );
                        listener.init(data.data);
                    }
                }
                this.channel.ack(msg);
            });
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
                    exclusive: true
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

    loadListeners(dir) {
        return new (require(dir))();
    }
}

module.exports = new ListenerManager();
