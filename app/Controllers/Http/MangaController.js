'use strict'

const Config = use('Config');
const got = require('got');
const util = require('../../Utils/util');
const Manga = use('App/Models/Manga');

class MangaController {
    async crawl({request, response}) {
        let result = await got(Config.get('crawl.list-manga'));
        result = JSON.parse(result.body);
        for (let item of result) {
            let manga = await Manga.findBy('name', item.label);
            if (!manga) {
                Manga.create({
                    name: item.label,
                    slug: util.slug(item.label),
                    image: item.img,
                    crawl_url: item.link
                })
            } else {
                manga.slug = util.slug(item.label);
                manga.image = item.img;
                manga.crawl_url = item.link;
                manga.save();
            }
        }
        response.json(result.length);
    }
}

module.exports = MangaController;
