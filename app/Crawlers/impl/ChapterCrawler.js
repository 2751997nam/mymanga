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

    async init(links = []) {
        let chapters = await Database.table("chapter").where({status: 'PENDING'}).whereIn('crawl_url', links);
        var exchange = Config.get('crawl.queueName');
        this.channel.assertExchange(exchange, "fanout", {
            durable: false
        });
        for (let item of chapters) {
            pubLimiter.removeTokens(1, (error, remainingRequests)  => {
                this.sentToQueue(exchange, {id: item.id, name: item.name, crawl_url: item.crawl_url, manga_id: item.manga_id});
            })
        }
    }
}

module.exports = MangaCrawler;
