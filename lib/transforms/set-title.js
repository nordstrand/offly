/**
 *  modifies value of document.title for html documents
 *
 */
var es = require('event-stream'),
    cheerio = require('cheerio');

module.exports = function (register) {
    var stream = es.mapSync(function (httpTransaction) {
        var processingHTML = httpTransaction.headers["Content-Type"] &&
            httpTransaction.headers["Content-Type"].indexOf("html") != -1;

        if (processingHTML) {
            $ = cheerio.load(new Buffer(httpTransaction.data, "base64").toString());

            $("title").text("OFFLY: " + $("title").text());

            httpTransaction.data = new Buffer($.html()).toString("base64");
        }

        return httpTransaction;
    });
    
    register(stream).as("mutate title tag").atPriority(100);
}