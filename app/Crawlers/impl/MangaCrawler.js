"use strict";

const Database = use("Database");
var amqp = require("amqplib/callback_api");
const Config = use('Config');

class MangaCrawler {
    async init() {
        let mangas = await Database.table("manga").limit(100);
        const connection = await this.createConnection();
        const channel = await this.createChannel(connection);
        var exchange = Config.get('crawl.queueName');
        channel.assertExchange(exchange, "fanout", {
            durable: true,
        });

        for (let item of mangas) {
            this.sentToQueue(exchange, channel, {
                listener: "MangaListener",
                data: item.crawl_url,
            });
        }
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

    sentToQueue(exchange, channel, data) {
        channel.sendToQueue(exchange, Buffer.from(JSON.stringify(data)), {
            persistent: true
        });
    }
}

module.exports = MangaCrawler;
