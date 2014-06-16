var filternet = require("filternet"),
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    options = require("./options.js"),
    temp = require("temp").track();

function startProxy() {
    if ( ! options.cli.sslDomain ) {
        if (options.cli.debug) {
            console.log("Starting non SSL proxy");
        }
        
        return filternet.createProxyServer();
        
    } else {
        
        var sslCerts = {};

        sslCerts[options.cli.sslDomain] = [ options.cli.sslKeyFile, options.cli.sslCrtFile];
        var socketDir = temp.mkdirSync(require("../package.json").name + "-");

        if (options.cli.debug) {
            console.log("Starting SSL proxy, will intercept requests for '"  + options.cli.sslDomain +
                        "', socket directory is '" + socketDir + "'.");
        }

        return filternet.createProxyServer({ 
                                     sslCerts: sslCerts,
                                     sslSockDir: socketDir,
        });
    }
}

exports.start = function(file) {
    
    var interceptingProxy = startProxy();

    var jsonOutputStream = JSONStream.stringifyObject();

    jsonOutputStream.pipe(fs.createWriteStream(file));
    console.log("Spooling http traffic to '" + file + "'");
    
    
    interceptingProxy.on("interceptResponseContent", function (buffer, responseObject, isSsl, charset, request, callback) {
        persistHttpTransaction(request, responseObject, buffer);
        callback(buffer);
    });


    interceptingProxy.on("shouldInterceptResponseContent", function(response, callback) {
        callback(true);
    });
    
    interceptingProxy.on('error', function (error) {
        console.log(error.stack);
    });


    function persistHttpTransaction(req, resp, buf) {
        if (options.cli.debug) {
            process.stdout.write(".");
        }
        jsonOutputStream.write([req.path, {
                                            headers : _.omit(fixHeaderCase(resp.headers), "Content-Encoding"),
                                            statusCode : resp.statusCode,
                                            size : buf.length,
                                            data : buf.toString("base64")
    }]);}

    process.on('SIGINT', function() {
        console.log("\nClosing '" + file + "'.");
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
