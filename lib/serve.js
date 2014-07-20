
var filternet = require("filternet"),
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    mkdirp = require('mkdirp'),
    urlparse = require('url').parse,
    es = require('event-stream'),
    path = require("path"),
    loadDumpFile = require("./common").loadDumpFile;




exports.start = function(options) {

    loadDumpFile(options.file)
    .then(function(data) {
        serve(data, options);
    });
};

function serve(data, options) {

    var file = options.file;
    var basePath = path.resolve(options.explode_path);

    console.log("Serving " + _.size(data) + " http transaction in '" + file + "'.");

    if (options.explode) {
        console.log("Content in '" + basePath + "' will take precedence.");
    }

    var interceptingProxy = filternet.createProxyServer();

    interceptingProxy.on("interceptRequest", function (request, response, callback) {

        var path = stripSb1CacheBuster(request.path);
        
        var responseData = data[path];

        if(responseData) {
            if (options.debug) {
                console.log(path + " => HTTP " +  responseData.statusCode + " " + responseData.size  + "b");
            }

            response.writeHead(responseData.statusCode, responseData.headers);
            if (responseData.size > 0) {
                var buf;
                if (options.explode && (buf = getFile(path))) {
                    var buf = getFile(path, options.debug);
                    response.write(new Buffer(buf, 'utf-8')); 
                } else {
                    response.write(new Buffer(responseData.data, 'base64'));
                }
            }
        } else {
            console.log(path + " => NOT FOUND");  
            response.writeHead(404, "Not found by offly");
        }

        response.end();
    });
    
    interceptingProxy.on('error', function (error) {
        console.log(error.stack);
    });

};



function stripSb1CacheBuster(url) {
    return url.replace(/\?_=\d*$/, "");
}


function getFile(url, debug) {
    var filePath = path.join(basePath, urlparse(url).pathname);

    if (debug) {
        console.log(url + " => " + filePath);
    }

    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
    } else {
        return undefined;
    }
}
