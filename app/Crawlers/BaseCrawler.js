"use strict";

const Database = use("Database");
var amqp = require("amqplib/callback_api");
const Config = use('Config');
var RateLimiter = require('limiter').RateLimiter;
var pubLimiter = new RateLimiter(1, 10);

class BaseCrawler {
    constructor(channel) {
        if (new.target === BaseCrawler) {
            throw new TypeError("Cannot construct BaseCrawler instances directly");
        }
        if (this.getListener === undefined) {
            // or maybe test typeof this.method === "function"
            throw new TypeError("Must override getListener");
        }
        this.channel = channel;
    }


    sentToQueue(exchange, data) {
        let sendData = {
            listener: this.getListener(),
            data: data,
        };

        this.channel.sendToQueue(exchange, Buffer.from(JSON.stringify(sendData)), {
            persistent: true
        });
    }
}

module.exports = BaseCrawler;
