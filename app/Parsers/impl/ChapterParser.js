"use strict";
const cheerio = require("cheerio");
const util = require("../../Utils/util");
const Chapter = use("App/Models/Chapter");
const Image = use("App/Models/Image");
const Database = use("Database");

class ChapterParser {
    async init(data, chapter) {
        const $ = cheerio.load(data);
        return await this.parse($, chapter)
    }

    async parse($, chapter) {
        let readSection = $('.reading-detail.box_doc');
        let data = [];
        let images = $(readSection).find('.page-chapter img');
        let imageUrls = [];
        if (images && images.length > 0) {
            for (let i = 0; i < images.length; i++) {
                let url = this.parseUrl($(images[i]).attr('src'));
                imageUrls.push(url);
                let image = {
                    chapter_id: chapter.id,
                    sorder: i,
                    url: url,
                    parse_url:  '',
                    error_url: ''
                };
                image.error_url = this.parseUrl($(image[i]).attr('data-original'));
                image.parse_url = this.parseUrl($(images[i]).attr('data-cdn'));
                if (url) {
                    data.push(image);
                }
            }
        }
        let existedImages = await Database.select('url').from('image').where('chapter_id', chapter.id).whereIn('url', imageUrls);
        let saveData = [];
        for (let i = 0; i < data.length; i++) {
            if (!existedImages.includes(data[i].url)) {
                saveData.push(data[i]);
            }
        }
        if (saveData.length) {
            await Database.from('image').insert(saveData);
        }
        chapter = await Chapter.find(chapter.id);
        chapter.status = 'FINISHED';
        await chapter.save();

        console.log('chapter: ' + chapter.crawl_url);

        return {
            next: [],
            continue: []
        };
    }

    parseUrl(url) {
        if (url && !url.includes('http')) {
            url = 'https:' + url;
        }

        return url;
    }
}

module.exports = ChapterParser;
