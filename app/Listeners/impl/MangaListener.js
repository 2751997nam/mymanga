'use strict'
const { exec } = require('child_process');
const MangaParser = require('../../Parsers/impl/MangaParser');

class MangaListener {
    async init (crawlUrl) {
        let result = await new Promise((resolve, reject) => {
            exec("curl --location --request GET '" + crawlUrl + "'", function (error, stdout, stderr) {
                if (error) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            })
        });
        let parser = new MangaParser();
        return parser.init(result, crawlUrl);
    }

    getContinueCrawler() {
        return "";
    }

    getNextCrawler() {
        return "ChapterCrawler";
    }
}

module.exports = MangaListener;