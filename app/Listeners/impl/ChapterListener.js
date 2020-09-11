'use strict'
const { exec } = require('child_process');
const ChapterParser = require('../../Parsers/impl/ChapterParser');

class ChapterListener {
    async init (chapter) {
        let result = await new Promise((resolve, reject) => {
            exec("curl --location --request GET '" + chapter.crawl_url + "'", {timeout: 5000}, function (error, stdout, stderr) {
                if (error) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            })
        });
        let parser = new ChapterParser();
        await parser.init(result, chapter);
    }
}

module.exports = ChapterListener;