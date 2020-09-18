'use strict'
const Helpers = use('Helpers');
const dir = Helpers.appRoot() + '/app';
const Util = use('App/Utils/util');
var amqp = require("amqplib/callback_api");
const Config = use('Config');

class CrawlerManager
{
    async init () {
        const connection = await this.createConnection();
        const channel = await this.createChannel(connection);
        this.channel = channel;
        this.connection = connection;
        // this.loadCrawlers(dir + '/Crawlers/impl');
        this.loadStartCrawler();
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

    loadStartCrawler() {
        let classPath = dir + '/Crawlers/impl/' + Config.get('crawl.start-crawler');
        var crawler = new (require(classPath))(this.channel);
        crawler.init();
    }
}

module.exports = new CrawlerManager();
