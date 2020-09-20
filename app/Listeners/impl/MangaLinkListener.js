'use strict'
const { exec } = require('child_process');
const MangaLinkParser = require('../../Parsers/impl/MangaLinkParser');

class MangaLinkListener {
    async init (crawlUrl) {
        let result = await new Promise((resolve, reject) => {
            exec("curl --location --request GET '" + crawlUrl + "'", {timeout: 5000}, function (error, stdout, stderr) {
                if (error) {
                    reject('');
                } else {
                    resolve(stdout);
                }
            })
        }).catch((error) => {
            console.log(error);
            return '';
        });
        let parser = new MangaLinkParser();
        let nextUrl = await parser.init(result);
        return nextUrl;
    }

    getContinueCrawler() {
        return "MangaLinkCrawler";
    }

    getNextCrawler() {
        return "MangaCrawler";
    }
}

module.exports = MangaLinkListener;