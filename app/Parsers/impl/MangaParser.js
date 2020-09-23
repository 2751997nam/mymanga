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
        if (data.description) {
            data.description = this.removeEmoji(data.description);
        }
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

    removeEmoji(text) {
        text = text.replace(/(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g, '');
        return text;
    }
}

module.exports = MangaParser;
