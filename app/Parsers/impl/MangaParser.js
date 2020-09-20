"use strict";
const cheerio = require("cheerio");
const util = require("../../Utils/util");
const Manga = use("App/Models/Manga");
const Database = use("Database");
class MangaParser {
    async init(data, crawlUrl) {
        const $ = cheerio.load(data);
        return await this.parse($, crawlUrl);
    }

    async parse($, crawlUrl) {
        let detail = $('#item-detail');
        
        let data = {
            crawl_url: crawlUrl
        };
        let retval = {
            next: [],
            continue: []
        };

        data = this.getText($, detail, data, 'name', '.title-detail');
        data = this.getText($, detail, data, 'alt', '.detail-info .list-info .othername .other-name');
        data = this.getText($, detail, data, 'authors', '.detail-info .list-info .author a', true);
        data = this.getText($, detail, data, 'status', '.detail-info .list-info .status p:last-child');
        data = this.getText($, detail, data, 'categories', '.detail-info .list-info .kind a', true);
        data = this.getText($, detail, data, 'description', '.detail-content > p');
        let image = $(detail).find('.col-image img');
        if (image) {
            image = $(image).attr('src');
            if (image) {
                data.image = image;
            }
        }
        if (data.status) {
            if (data.status == 'Hoàn thành') data.status = 'FINISHED';
            else if (data.status == 'Đang tiến hành') data.status = 'ACTIVE';
            else data.status = 'ACTIVE';
        }

        let listChapter = $(detail).find('.list-chapter .row a');
        let chapters = [];
        for (let i = 0; i < listChapter.length; i++) {
            let chapter = {};
            let name = $(listChapter[i]).text();
            if (name) {
                chapter.name = name;
                chapter.slug = util.slug(name);
            }
            let crawlUrl = $(listChapter[i]).attr('href');
            if (crawlUrl) {
                chapter.crawl_url = crawlUrl;
            }
            chapter.status = 'PENDING';

            if (chapter.name && chapter.crawl_url) {
                retval.continue.unshift(chapter.crawl_url);
                chapters.unshift(chapter);
            }
        }

        if(chapters.length > 0) {
            data.chapters = chapters;
        }

        let manga = await this.saveData(data);

        if (data.chapters) {
            retval.next = await this.saveChapters(manga.id, data.chapters);
        }
        console.log('manga: ', manga.name);

        return retval;
    }

    getText($, detail, data, column, selector, isArray = false) {
        let ele = $(detail).find(selector);
        if (ele && !isArray) {
            ele = $(ele).text();
            if (ele) {
                data[column] = ele;
            }
        } else if(ele && isArray) {
            let arr = [];
            for (let i = 0; i < ele.length; i++) {
                let text  = $(ele[i]).text();
                if (text) {
                    arr.push(text);
                }
            }
            if (arr.length) {
                data[column] = arr;
            }
        }
        return data;
    }

    async saveManga(manga, data) {
        let keys = ['status', 'image', 'description', 'alt'];
        for (let key of keys) {
            if (manga[key] != data[key]) {
                manga[key] = data[key];
            }
        }
        await manga.save();
    }

    async saveData(data) {
        let manga = await Manga.findBy('crawl_url', data.crawl_url);
        if (manga) {
            this.saveManga(manga, data);
        } else {
            return;
            // manga = new Manga();
            // manga.name = data.name;
            // manga.alt = data.alt;
            // manga.slug = util.slug(data.name);
            // manga.image = data.image;
            // manga.status = data.status;
            // manga.description = data.description;
            // manga.crawl_url = data.crawl_url;
            // await manga.save();
        }
        if (data.categories && Array.isArray(data.categories)) {
            for (let item of data.categories) {
                this.saveRelation(manga.id, item, 'category', 'category_n_manga', 'category_id');
            }
        }
        if (data.authors && Array.isArray(data.authors)) {
            for (let item of data.authors) {
                this.saveRelation(manga.id, item, 'author', 'author_n_manga', 'author_id');
            }
        }
        if (data.translators) {
            for (let item of data.translators) {
                this.saveRelation(manga.id, item, 'translator', 'manga_n_translator', 'translator_id');
            }
        }

        return manga;
    }

    async saveChapters(mangaId, data) {
        let slugs = [];
        for(let i = 0; i < data.length; i++) {
            slugs.push(data[i].slug);
        }
        let chapters = await Database.select('slug').from('chapter')
            .where('manga_id', mangaId)
            .whereIn('slug', slugs);
        let existedSlugs = [];
        for (let i = 0; i < chapters.length; i++) {
            existedSlugs.push(chapters[i].slug);
        }
        let saveData = [];
        let retval = [];
        for (let i = 0; i < data.length; i++) {
            if (!existedSlugs.includes(data[i].slug)) {
                retval.push(data[i].crawl_url);
                data[i].manga_id = mangaId;
                saveData.push(data[i]);
            }
        }

        await Database.from('chapter').insert(saveData);

        return retval;
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
