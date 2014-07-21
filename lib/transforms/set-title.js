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
            $ = cheerio.load(httpTransaction.data.toString());

            $("title").text("OFFLY: " + $("title").text());

            httpTransaction.data = new Buffer($.html());
        }

        return httpTransaction;
    });
    
    register(stream).as("mutate title tag").atPriority(100);
}