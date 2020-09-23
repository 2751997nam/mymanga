'use strict'

const CrawlerManager = use("App/Crawlers/CrawlerManager");
const MangaCrawler = use("App/Crawlers/impl/MangaCrawler");
const Database = use("Database");

class MangaController {
    async crawl({request, response}) {
        let mangaCrawler = new MangaCrawler(CrawlerManager.getInstance().getChannel());
        let mangas = await Database.from('manga').select('crawl_url');
        let links = [];
        for (let i = 0; i < mangas.length; i++) {
            links.push(mangas[i].crawl_url);
        }
        mangaCrawler.init(links);

        return response.json({
            'status': 'crawling'
        });
    }

    async crawlAll({request, response}) {
        CrawlerManager.getInstance().crawlAll();

        return response.json({
            'status': 'crawling'
        });
    }

    async crawlLink({request, response}) {
        CrawlerManager.getInstance().crawlLink();

        return response.json({
            'status': 'crawling'
        });
    }

    async crawlManga({request, response}) {
        CrawlerManager.getInstance().crawlManga();

        return response.json({
            'status': 'crawling'
        });
    }

    async crawlChapter({request, response}) {
        CrawlerManager.getInstance().crawlChapter();

        return response.json({
            'status': 'crawling'
        });
    }
}

module.exports = MangaController;
