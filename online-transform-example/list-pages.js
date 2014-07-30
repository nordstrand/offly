/*jshint node: true */

var es = require("event-stream"),
    _  = require("underscore"),
    cheerio = require('cheerio');

module.exports = function (register, ctx) {
    
    var data = ctx.data;

    var stream = es.mapSync(function (d) {
        var request = d.request;
        
        if (request.path === "/urls") {
            return generateIndexOfPages(d);
        } else {
            return d;
        }
    });

    register(stream).as("show availale urls at /urls").atPriority(25);

    function generateIndexOfPages(d) {
        var response = d.response;

        var transactions = _(_.values(data)).chain()
            .filter(isHtml)
            .where({statusCode : 200})
            .sortBy("size")
            .reverse()
            .value();

        var pages = [];

        _.forEach(transactions, function(transaction) {
            //console.log(getTitle(transaction) + "\n - " + transaction.url);
            pages.push({title : getTitle(transaction),
                        size  : transaction.size,
                        url   : transaction.url});
        });

        var html = "<html><body><h1>Pages</h1>"+
                    "<table style='border-collapse: separate; border-spacing: 1em;'>"+
                    _.reduce(pages, function(memo, item) { 
                        return memo + 
                            "\n<tr><td>" + item.title + "</td><td>" + 
                            item.size +
                            "</td></tr>" +
                            "<tr><td colspan='2' style='word-wrap: break-word; max-width: 650px;'>" +
                            "<a href='" + item.url + "'>" + item.url + "</a> "+
                            "</td></tr>";
                    }, "") +
                   "</table></body></html>";

        response.data = new Buffer(html);
        response.statusCode = 200;
        response.headers = {};
        response.headers["Content-Type"] = "text/html";

        return d;
    }
};

function getTitle(transaction) {
    var $ = cheerio.load(new Buffer(transaction.data, 'base64').toString());
    return  "[" + $("title").text().trim() + "]";
}

function isHtml(t) {
    return t.headers["Content-Type"] &&
           t.headers["Content-Type"].indexOf("text/html") != -1;
}