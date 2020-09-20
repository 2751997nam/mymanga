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

        this.channel.consume(this.exchange, async (msg) => {
            // await this.rateLimter(async () => {
            subLimiter.removeTokens(1, async (error, remainingRequests)  => {
                if (msg.content) {
                    let data = JSON.parse(msg.content.toString());
                    console.log("received", data);
                    if (data.listener) {
                        const listener = this.loadListeners(
                            this.implDir + "/" + data.listener
                        );
                        let result = await listener.init(data.data);
 
                        if (result.next && data.allowNext) {
                            this.callCrawler(listener.getNextCrawler(), {urls: result.next, allowNext: data.allowNext});
                        }
                        if (result.continue.length > 0) {
                            this.callCrawler(listener.getContinueCrawler(), {urls: result.continue, allowNext: data.allowNext});
                        }
                    }
                }
                this.channel.ack(msg);
            });
        });
    }

    async callCrawler(crawlerName, param) {
        let cralwer = null;
        if (crawlerName) {
            let classPath = dir + '/Crawlers/impl/' + crawlerName + '.js';
            cralwer = new (require(classPath))(this.channel);
            await cralwer.init(param);
        }
        return cralwer;
    }

    async rateLimter(callback) {
        if (global.consumeCount > 90) {
            global.consumeRate = 60000;
        }
        else if (global.consumeCount > 80) {
            global.consumeRate = 40000;
        }
        else if (global.consumeCount > 70) {
            global.consumeRate = 30000;
        } else if (global.consumeCount > 60) {
            global.consumeRate = 20000;
        } else if (global.consumeCount > 50) {
            global.consumeRate = 10000;
        } else {
            global.consumeRate = 1000;
        }

        // await new Promise((resolve, reject) => {
        //     setTimeout(() => {
        //         resolve(1);
        //     }, global.consumeRate);
        // })
        callback();
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
