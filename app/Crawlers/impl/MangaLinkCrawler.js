"use strict";

const BaseCrawler = require("../BaseCrawler");
const Config = use('Config');
var RateLimiter = require('limiter').RateLimiter;
var pubLimiter = new RateLimiter(1, 1000);

class MangaLinkCrawler extends BaseCrawler {
    getListener () {
        return "MangaLinkListener";
    }

    async init(urls = []) {
        if (!urls.length) {
            urls = [Config.get('crawl.all-manga')];
        }
        var exchange = Config.get('crawl.queueName');
        this.channel.assertExchange(exchange, "fanout", {
            durable: false,
        });
        setTimeout(() => {
            for (let i = 0; i < urls.length; i++) {
                pubLimiter.removeTokens(1, (error, remainingRequests)  => {
                    this.sentToQueue(exchange, urls[i]);
                });
            }
        }, 3000);
    }
}

module.exports = MangaLinkCrawler;
