'use strict'
const Helpers = use('Helpers');
const dir = Helpers.appRoot() + '/app';
const Util = use('App/Utils/util');
var amqp = require("amqplib/callback_api");
const Config = use('Config');
const Database = use('Database');
class Crawler
{
    async init () {
        const connection = await this.createConnection();
        const channel = await this.createChannel(connection);
        this.channel = channel;
        this.connection = connection;
    }

    getConnection() {
        return this.connection;
    }

    getChannel () {
        return this.channel;
    }

    createConnection() {
        return new Promise((resolve, reject) => {
            amqp.connect("amqp://localhost", function (error, connection) {
                if (error) {
                    reject(error);
                } else {
                    resolve(connection);
                }
            });
        });
    }

    createChannel(connection) {
        return new Promise((resolve, reject) => {
            connection.createChannel(function (error, channel) {
                if (error) {
                    reject(error);
                } else {
                    resolve(channel);
                }
            });
        });
    }

    loadCrawlers(dir) {
        var classPaths = Util.browseFiles(dir);
        classPaths.forEach((classPath) => {
            if (classPath.indexOf(".js") === (classPath.length - 3)) {
                var crawler = new (require(classPath))(this.channel);
                crawler.init();
            }
        });
    };

    crawlAll(params = {}) {
        let classPath = dir + '/Crawlers/impl/MangaLinkCrawler';
        var crawler = new (require(classPath))(this.channel);
        crawler.init(params);
    }

    crawlLink() {
        this.crawlAll({
            urls: [Config.get('crawl.all-manga')],
            allowNext: false
        });
    }

    async crawlManga() {
        let classPath = dir + '/Crawlers/impl/MangaCrawler';
        var crawler = new (require(classPath))(this.channel);
        let mangas = await Database.select('crawl_url').from('manga');
        let urls = [];
        for (let item of mangas) {
            urls.push(item.crawl_url);
        }
        crawler.init({
            urls: urls,
            allowNext: false
        });
    }

    async crawlChapter() {
        let classPath = dir + '/Crawlers/impl/ChapterCrawler';
        var crawler = new (require(classPath))(this.channel);
        let chapters = await Database.select('crawl_url').from('chapter').where({status: 'PENDING'});
        let urls = [];
        for (let item of chapters) {
            urls.push(item.crawl_url);
        }
        crawler.init({
            urls: urls,
            allowNext: false
        });
    }
}

var CrawlerManager = (function () {
    var instance = null;

    return {
        getInstance: function () {
            if (instance == null) {
                instance = new Crawler();
                instance.constructor = null;
            }

            return instance;
        }
    }
})();

module.exports = CrawlerManager;
