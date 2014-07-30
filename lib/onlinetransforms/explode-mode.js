var fs = require("fs"),
    path = require("path"),
    urlparse = require('url').parse,
    es = require('event-stream');

module.exports = function (register, ctx) {
    
    var options = ctx.options,
        debug = ctx.log.debug,
        info = ctx.log.info;
    
    function getFile(url) {
        var filePath = path.join(options.explode_path, urlparse(url).pathname);
        
        debug("Mapped URL %s to file %s", url, filePath);
        
        if (fs.existsSync(filePath)) {
            info("Replacing URL %s with contents of file %s", url, filePath);
            return fs.readFileSync(filePath);
        } else {
            return undefined;
        }
    }

    var stream = es.mapSync(function (httpTransaction) {
        var request = httpTransaction.request,
            response = httpTransaction.response,
            path = request.path,
            buf;
        
        if (options.explode && (buf = getFile(path))) {
            response.data = new Buffer(buf, 'utf-8');
        }

        return httpTransaction;
    });
 
    register(stream).as("loads data from local filesystem in exploded mode").atPriority(12);
};
