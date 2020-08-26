"use strict";
const cheerio = require("cheerio");
const util = require("../../Utils/util");
const Chapter = use("App/Models/Chapter");
const Image = use("App/Models/Image");
const Database = use("Database");

class ChapterParser {
    async init(data, chapter) {
        const $ = cheerio.load(data);
        await this.parse($, data, chapter)
    }

    async parse($, data, chapter) {
        let readSection = $('div.vung_doc');
        let dataManga = null;
        let dataChapter = null;
        let saveData = [];
        if (readSection) {
            dataManga = $(readSection).attr('data-manga');
            dataChapter = $(readSection).attr('data-chapter');
        }
        var myRegexp = /(var content=)(\[(.?)+\])/gm;
        let content = myRegexp.exec(data);
        if (content && content.length > 2) {
            content = content[2];
            content = content.replace(',]', ']');
            content = JSON.parse(content);
        }
        if (content && content.length > 0) {
            for (let i = 0; i < content.length; i++) {
                let image = {
                    chapter_id: chapter.id,
                    sorder: i,
                    url: content[i],
                    parse_url:  '',
                    error_url: ''
                };
                if (dataChapter && dataManga) {
                    var link = 'http://1.truyentranhmanga.com/images/' + dataManga + '/' + dataChapter + '/';

                    image.parse_url = link + i + '.' + this.getExtension(content[i]);
                }
                image.error_url = 'http://truyentranhmanga.com/images/' + this.btoa(content[i]) + '.jpg';

                saveData.push(image);
            }
        }

        for (let item of saveData) {
            let img = await Database.table('image')
                .where('chapter_id', item.chapter_id)
                .where('sorder', item.sorder)
                .first();
            if (!img) {
                await Image.create(item);
            }
        }

        chapter = await Chapter.find(chapter.id);
        chapter.status = 'FINISHED';
        await chapter.save();
    }

    atob(str) {
        return Buffer.from(str, 'base64').toString('binary');
    }

    btoa(str) {
        return Buffer.from(str, 'binary').toString('base64');
    }

    getExtension(url) {
        let extension = url.split('.').pop().split(/\#|\?/)[0];
        extension = extension.toLowerCase();
        switch (extension) {
        case 'jpg':
            break;
        case 'jpeg':
            break;
        case 'png':
            break;
        case 'gif':
            break;
        default:
            extension = 'jpg';
            break;
        }
        return extension;
    }
}

module.exports = ChapterParser;
