var fs = require("fs");

function Util() {
    /**
     * Get file list with full-path in a directory
     * @param {String} directory
     * @returns {Array}
     */
    this.browseFiles = function (directory) {
        var retval = [];
        var self = this;
        if (fs.existsSync(directory)) {
            fs.readdirSync(directory).forEach(function (item) {
                var subPath = directory + "/" + item;
                if (fs.lstatSync(subPath).isDirectory()) {
                    var files = self.browseFiles(subPath);
                    if (files.length > 0) {
                        retval = retval.concat(files);
                    }
                } else {
                    retval.push(subPath);
                }
            });
        }
        return retval;
    };

    this.slug = function (data) {
        var retval = data;
        try {
            str = retval;
            str = str.replace(/^\s+|\s+$/g, ""); // trim
            str = str.toLowerCase();

            // remove accents, swap ñ for n, etc
            var from = "åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;";
            var to = "aaaaaaeeeeiiiioooouuuunc------";

            for (var i = 0, l = from.length; i < l; i++) {
                str = str.replace(
                    new RegExp(from.charAt(i), "g"),
                    to.charAt(i)
                );
            }

            str = str
                .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
                .replace(/\s+/g, "-") // collapse whitespace and replace by -
                .replace(/-+/g, "-") // collapse dashes
                .replace(/^-+/, "") // trim - from start of text
                .replace(/-+$/, ""); // trim - from end of text

            return str;
        } catch (e) {
        } finally {
        }
        return retval;
    };

    this.removeEmoji = function (str) {
        return str.replace(/([#0-9]\u20E3)|[\xA9\xAE\u203C\u2047-\u2049\u2122\u2139\u3030\u303D\u3297\u3299][\uFE00-\uFEFF]?|[\u2190-\u21FF][\uFE00-\uFEFF]?|[\u2300-\u23FF][\uFE00-\uFEFF]?|[\u2460-\u24FF][\uFE00-\uFEFF]?|[\u25A0-\u25FF][\uFE00-\uFEFF]?|[\u2600-\u27BF][\uFE00-\uFEFF]?|[\u2900-\u297F][\uFE00-\uFEFF]?|[\u2B00-\u2BF0][\uFE00-\uFEFF]?|(?:\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDEFF])[\uFE00-\uFEFF]?/g, '');
    }
}

module.exports = new Util();
