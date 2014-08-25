/*jshint node: true */

var es = require('event-stream'),
    URL = require('url'),
    cheerio = require('cheerio');

module.exports = function (register, ctx) {
    
    var options = ctx.options;
    
    var stream = es.mapSync(function (httpTransaction) {
        var response = httpTransaction;
        
        var processingHTML = response.headers &&
            response.headers["Content-Type"] &&
            response.headers["Content-Type"].indexOf("html") != -1;

        
        if (processingHTML && (options.recursive || options.relativize)) {
            var $ = cheerio.load(response.data.toString());
            $("a").each(function() {
                try{
                    var href = $(this).attr('href');
                    if (href) {
                        var path = URL.parse(href).pathname;
                        $( this ).attr("href",  path);
                    }
                } catch (e) {
                    console.log(e + ": " + href);
                }
            });
            response.data = new Buffer($.html());
        }

        return httpTransaction;
    });
    
    register(stream).as("make anchor href's relative ").atPriority(100);
};