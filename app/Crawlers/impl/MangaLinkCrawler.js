"use strict";

const BaseCrawler = require("../BaseCrawler");
const Config = use('Config');
var RateLimiter = require('limiter').RateLimiter;
var pubLimiter = new RateLimiter(1, 1000);

class MangaLinkCrawler extends BaseCrawler {
    getListener () {
        return "MangaLinkListener";
    }

    async init(params) {
        let urls = [];
        if (!params || !params.urls) {
            urls = [Config.get('crawl.all-manga')];
        } else {
            urls = params.urls;
        }
        var exchange = Config.get('crawl.queueName');
        this.channel.assertExchange(exchange, "fanout", {
            durable: false,
        });
        for (let i = 0; i < urls.length; i++) {
            pubLimiter.removeTokens(1, (error, remainingRequests)  => {
                this.sentToQueue(exchange, urls[i], params.allowNext);
            });
        }
    }
}

module.exports = MangaLinkCrawler;
