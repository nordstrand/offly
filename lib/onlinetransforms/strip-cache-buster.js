var fs = require("fs"),
    path = require("path"),
    urlparse = require('url').parse,
    es = require('event-stream');

module.exports = function (register, ctx) {
    
    var options = ctx.options,
        info = ctx.log.info;

    var stream = es.mapSync(function (httpTransaction) {
        var request = httpTransaction.request,
            path = request.path;
    
        var strippedPath = strip(path);
        
        if (strippedPath !== path) {
            info("Stripping apparent dynamic cachebuster: %s=>%s", path, strippedPath);
        }
        
        httpTransaction.request.path = strippedPath;

        return httpTransaction;
    });
 
    register(stream).as("strips cache buster").atPriority(4);
};


function strip(path) {
    return path.replace(/\?_.*$/, "");
}