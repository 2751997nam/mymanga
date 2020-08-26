"use strict";

const Database = use("Database");
const BaseCrawler = require("../BaseCrawler");
const Config = use('Config');
var RateLimiter = require('limiter').RateLimiter;
var pubLimiter = new RateLimiter(1, 10);

class MangaCrawler extends BaseCrawler {
    getListener () {
        return "ChapterListener";
    }

    async init() {
        let chapters = await Database.table("chapter").where({status: 'PENDING'});
        var exchange = Config.get('crawl.queueName');
        this.channel.assertExchange(exchange, "fanout", {
            durable: false
        });
        for (let item of chapters) {
            pubLimiter.removeTokens(1, (error, remainingRequests)  => {
                this.sentToQueue(exchange, item);
            })
        }
    }
}

module.exports = MangaCrawler;
