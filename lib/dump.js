
var filternet = require('filternet'),
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    options = require("./options.js");


var interceptingProxy = filternet.createProxyServer();

exports.start = function(file) {

    var jsonOutputStream = JSONStream.stringifyObject();

    jsonOutputStream.pipe(fs.createWriteStream(file));
    console.log("Spooling http traffic to " + file);
    
    
    interceptingProxy.on("interceptResponseContent", function (buffer, responseObject, isSsl, charset, request, callback) {
        persistHttpTransaction(request, responseObject, buffer);
        callback(buffer);
    });


    interceptingProxy.on("shouldInterceptResponseContent", function(response, callback) {
        callback(true);
    });

    function persistHttpTransaction(req, resp, buf) {
        if (options.get('debug')) {
            process.stdout.write(".");
        }
        jsonOutputStream.write([req.path, {
                                            headers : _.omit(fixHeaderCase(resp.headers), "Content-Encoding"),
                                            statusCode : resp.statusCode,
                                            size : buf.length,
                                            data : buf.toString("base64")
    }]);}

    process.on('SIGINT', function() {
        console.log('\nClosing ' + file);
        jsonOutputStream.end();
        process.exit();
    });
};


var fixHeaderCase = function (headers) {
    var result = {};
    for (var key in headers) {
        if (!headers.hasOwnProperty(key))
            continue;
        
        
        var newKey = key.split('-')
                         .map(function(token){ return token[0].toUpperCase()+token.slice(1); })
                         .join('-');
        result[newKey] = headers[key];
    }
    return result;
};
