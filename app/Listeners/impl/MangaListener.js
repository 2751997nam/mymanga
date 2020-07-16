'use strict'
const { exec } = require('child_process');
const MangaParser = require('../../Parsers/impl/MangaParser');

class MangaListener {
    async init (data) {
        let result = await new Promise((resolve, reject) => {
            exec("curl --location --request GET '" + data + "'", function (error, stdout, stderr) {
                if (error) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            })
        });
        let parser = new MangaParser();
        parser.init(result);
    }
}

module.exports = MangaListener;