'use strict'
const Helpers = use('Helpers');
const dir = Helpers.appRoot() + '/app';
const Util = use('App/Utils/util');

class CrawlerManager
{
    init () {
        this.loadCrawlers(dir + '/Crawlers/impl');
    }

    loadCrawlers(dir) {
        var classPaths = Util.browseFiles(dir);
        classPaths.forEach(function (classPath) {
            if (classPath.indexOf(".js") === (classPath.length - 3)) {
                var crawler = new (require(classPath))();
                crawler.init();
            }
        });
    };
}

module.exports = new CrawlerManager();
