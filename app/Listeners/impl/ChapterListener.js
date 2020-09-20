'use strict'
const { exec } = require('child_process');
const ChapterParser = require('../../Parsers/impl/ChapterParser');

class ChapterListener {
    async init (chapter) {
        let result = await new Promise((resolve, reject) => {
            exec("curl --location --request GET '" + chapter.crawl_url + "'", {timeout: 5000}, function (error, stdout, stderr) {
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
        let parser = new ChapterParser();
        return await parser.init(result, chapter);
    }

    getContinueCrawler() {
        return "";
    }

    getNextCrawler() {
        return "";
    }
}

module.exports = ChapterListener;