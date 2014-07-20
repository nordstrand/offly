
var filternet = require('filternet'),
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    options = require("./options.js"),
    mkdirp = require('mkdirp'),
    urlparse = require('url').parse,
    es = require('event-stream'),
path = require("path"); 

var basePath = path.resolve(options.cli["explode_path"]);

var interceptingProxy = filternet.createProxyServer();


exports.start = function(file) {

    var data = readDumpFile(file);


    console.log("Serving " + _.size(data) + " http transaction in '" + file + "'.");

    if (options.cli["explode"]) {
        console.log("Content in '" + basePath + "' will take precedence.");
    }


    interceptingProxy.on("interceptRequest", function (request, response, callback) {

        var responseData = data[request.path];

        var path = stripSb1CacheBuster(request.path);
        
        var responseData = data[path];

        if(responseData) {
            if (options.cli.debug) {
                console.log(path + " => HTTP " +  responseData.statusCode + " " + responseData.size  + "b");
            }

            response.writeHead(responseData.statusCode, responseData.headers);
            if (responseData.size > 0) {
                var buf;
                if (options.cli.explode && (buf = getFile(path))) {
                    var buf = getFile(path);
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


function readDumpFile(file) {

    var data = {};

    fs.createReadStream(file)
    .pipe(JSONStream.parse("*"))
    .pipe(es.mapSync(function (d) {
        data[d.url] = d;
        return d;
    }));

    return data;
}

function stripSb1CacheBuster(url) {
    return url.replace(/\?_=\d*$/, "");
}


function getFile(url) {
    var filePath = path.join(basePath, urlparse(url).pathname);

    if (options.cli.debug) {
        console.log(url + " => " + filePath);
    }

    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
    } else {
        return undefined;
    }
}
