"use strict";

const Database = use("Database");
const BaseCrawler = require("../BaseCrawler");
const Config = use('Config');
var RateLimiter = require('limiter').RateLimiter;
var pubLimiter = new RateLimiter(1, 10);

class MangaCrawler extends BaseCrawler {
    getListener () {
        return "MangaListener";
    }

    async init() {
        let mangas = await Database.table("manga").where({status: 'ACTIVE'});
        var exchange = Config.get('crawl.queueName');
        this.channel.assertExchange(exchange, "fanout", {
            durable: false,
        });
        for (let item of mangas) {
            pubLimiter.removeTokens(1, (error, remainingRequests)  => {
                this.sentToQueue(exchange, item.crawl_url);
            })
        }
    }
}

module.exports = MangaCrawler;
