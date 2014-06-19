
var filternet = require('filternet'),
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    options = require("./options.js"),
    mkdirp = require('mkdirp'),
    urlparse = require('url').parse
path = require("path"); 

var basePath = path.resolve(options.cli["explode_path"]);

var interceptingProxy = filternet.createProxyServer();


exports.start = function(file) {

    var fileData = fs.readFileSync(file);

    var data = JSON.parse(fileData);

    console.log("Serving " + _.size(_.keys(data)) + " http transaction in '" + file + "'.");

    if (options.cli["explode"]) {
        console.log("Content in '" + basePath + "' will take precedence.");
    }


    interceptingProxy.on("interceptRequest", function (request, response, callback) {
        var responseData = data[request.path];

        if(responseData) {
            if (options.cli.debug) {
                console.log(request.path + " => HTTP " +  
                            responseData.statusCode + " " + responseData.size  + "b");
            }

            response.writeHead(responseData.statusCode, responseData.headers);
            if (responseData.size > 0) {
                var buf;
                if (options.cli.explode && (buf = getFile(request.path))) {
                    var buf = getFile(request.path);
                    response.write(new Buffer(buf, 'utf-8')); 
                } else {
                    response.write(new Buffer(responseData.data, 'base64'));
                }
            }
        } else {
            console.log(request.path + " => NOT FOUND");  
            response.writeHead(404, "Not found by offly");
        }

        response.end();
    });
    
    interceptingProxy.on('error', function (error) {
        console.log(error.stack);
    });

};


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