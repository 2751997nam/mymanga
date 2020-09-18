"use strict";

const BaseCrawler = require("../BaseCrawler");
const Config = use('Config');
var RateLimiter = require('limiter').RateLimiter;
var pubLimiter = new RateLimiter(1, 1000);

class MangaCrawler extends BaseCrawler {
    getListener () {
        return "MangaListener";
    }

    async init(links = []) {
        var exchange = Config.get('crawl.queueName');
        this.channel.assertExchange(exchange, "fanout", {
            durable: false,
        });
        for (let link of links) {
            pubLimiter.removeTokens(1, (error, remainingRequests)  => {
                this.sentToQueue(exchange, link);
            })
        }
    }
}

module.exports = MangaCrawler;
