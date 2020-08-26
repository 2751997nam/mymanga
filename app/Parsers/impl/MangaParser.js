"use strict";
const cheerio = require("cheerio");
const util = require("../../Utils/util");
const Manga = use("App/Models/Manga");
const Database = use("Database");

class MangaParser {
    init(data) {
        const $ = cheerio.load(data);
        this.parse($);
    }

    async parse($) {
        let header = $("div.truyen_if_wrap");
        let image = $(header).find("img");
        let data = {};
        if (image) {
            image = $(image).attr("src");
            if (image) {
                data.image = image.replace(/-[0-9]+x[0-9]+/gm, "");
            }
        }
        let info = $(header).find("ul.truyen_info_right");
        data.name = this.parseInfo($, info, "h1.entry-title");
        data.authors = this.parseInfo(
            $,
            info,
            "li:nth-child(2) a",
            "multiple"
        );
        data.categories = this.parseInfo(
            $,
            info,
            "li:nth-child(3) a",
            "multiple"
        );
        let status = this.parseInfo($, info, "li:nth-child(4) a");
        if (status == 'Đang tiến hành') {
            data.status = 'ACTIVE';
        } else if (status == 'Hoàn thành') {
            data.status = 'FINISHED';
        } else {
            data.status = 'ACTIVE';
        }
        data.translators = this.parseInfo($, info, "li:nth-child(5) a", 'multiple');
        let description = $('div.entry-content');
        if (description) {
            data.description = $(description).html();
            data.description = util.removeEmoji(data.description);
        }
        data.chapters = [];
        let listChapters = $('div.chapter-list div.row');
        if (listChapters) {
            listChapters.each((index, element) => {
                let info = $(element).find('span a');
                if (info) {
                    let name = $(info).text();
                    data.chapters.push({
                        name: name,
                        slug: util.slug(name),
                        crawl_url: $(info).attr('href'),
                    });
                }
            })
        }
        if (data) {
            this.saveData(data);
        }
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

    async saveData(data) {
        let manga = await Manga.findBy('slug', util.slug(data.name));
        if (manga) {
            this.saveManga(manga, data);
        } else {
            manga = new Manga();
            manga.name = data.name;
            manga.slug = util.slug(data.name);
            manga.image = data.image;
            manga.status = data.status;
            manga.description = data.description;
            await manga.save();
        }
        for (let item of data.categories) {
            this.saveRelation(manga.id, item, 'category', 'category_n_manga', 'category_id');
        }
        for (let item of data.authors) {
            this.saveRelation(manga.id, item, 'author', 'author_n_manga', 'author_id');
        }
        for (let item of data.translators) {
            this.saveRelation(manga.id, item, 'translator', 'manga_n_translator', 'translator_id');
        }
        for (let item of data.chapters) {
            this.saveOneToManyRelation(manga.id, item, 'chapter');
        }

        console.log('parsed: ', manga.name);
    }

    async saveOneToManyRelation(mangaId, data, table) {
        let obj = await Database.table(table)
            .where('slug', data.slug)
            .first();
        if (!obj) {
            data.manga_id = mangaId;
            await Database.table(table).insert(data);
        } 
    }

    async saveRelation(mangaId, name, table, pivot, column) {
        let slug = util.slug(name);
        let objID = await Database.table(table)
            .where('slug', slug)
            .first();
        if (!objID) {
            objID = await Database.table(table).insert({
                name: name,
                slug: slug,
            });
        } else {
            objID = objID.id;
        }
        let pivotObj = await Database.table(pivot)
            .where('manga_id', mangaId)
            .where(column, objID)
            .first();
        if (!pivotObj) {
            let data = {};
            data.manga_id = mangaId;
            data[column] = objID;
            await Database.table(pivot).insert(data);
        }
    }

    parseInfo($, container, selector, type = "single") {
        let retVal = type == "single" ? "" : [];
        try {
            let elements = $(container).find(selector);
            if (type == "single" && elements) {
                retVal = $(elements).text();
            } else if (elements) {
                elements.each((index, element) => {
                    retVal.push($(element).html());
                });
            }
        } catch (error) {
            console.log(error.message);
        }

        return retVal;
    }
}

module.exports = MangaParser;
