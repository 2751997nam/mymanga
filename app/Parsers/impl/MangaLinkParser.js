"use strict";
const cheerio = require("cheerio");
const util = require("../../Utils/util");
const Database = use("Database");
const Manga = use("App/Models/Manga");

class MangaLinkParser {
    async init(data) {
        const $ = cheerio.load(data);
        return await this.parse($);
    }

    async parse($) {
        let mangaItems = $('div.items > div > div > figure > figcaption > h3 > a');
        let retval = {
            next: [],
            continue: []
        };
        if (mangaItems.length > 0) {
            for (let i = 0; i < mangaItems.length; i++) {
                let item = mangaItems[i];
                let saveData = {
                    crawl_url: $(item).attr('href'),
                    name: $(item).text(),
                }
                saveData.slug = util.slug(saveData.name);
                
                let manga = await Manga.findBy('crawl_url', saveData.crawl_url);
                if (manga) {
                    this.saveManga(manga, saveData);
                } else {
                    manga = new Manga();
                    manga.name = saveData.name;
                    manga.slug = saveData.slug;
                    manga.crawl_url = saveData.crawl_url;
                    await manga.save();
                }
                if (manga) {
                    retval.next.push(saveData.crawl_url);
                }
            }
        }

        let ele = $('ul.pagination > li a.next-page');
        if (ele && $(ele).attr('href')) {
            retval.continue = [$(ele).attr('href')];
        }

        return retval;
    }

    async saveManga(manga, data) {
        let keys = ['status', 'image', 'description'];
        for (let key of keys) {
            if (manga[key] != data[key]) {
                manga[key] = data[key];
            }
        }
        await manga.save();
    }
}

module.exports = MangaLinkParser;
