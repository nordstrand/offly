var filternet = require("filternet"),
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    temp = require("temp").track(),
    es = require('event-stream');

function startProxy(options) {
    if ( ! options.sslDomain ) {
        if (options.debug) {
            console.log("Starting non SSL proxy");
        }
        
        return filternet.createProxyServer();
        
    } else {
        
        var sslCerts = {};

        sslCerts[options.sslDomain] = [ options.sslKeyFile, options.sslCrtFile];
        var socketDir = temp.mkdirSync(require("../package.json").name + "-");

        if (options.debug) {
            console.log("Starting SSL proxy, will intercept requests for '"  + options.sslDomain +
                        "', socket directory is '" + socketDir + "'.");
        }

        return filternet.createProxyServer({ 
                                     sslCerts: sslCerts,
                                     sslSockDir: socketDir,
        });
    }
}

exports.start = function(options) {
    
    var file = options.file;
    var writeStream = setupWriteStream(file);
    var interceptingProxy = startProxy(options);

    console.log("Dumping http traffic to '" + file + "'");
    
    
    interceptingProxy.on("interceptRequest", function (requestOptions, wtf, callback) {
        
        
        if (options.debug) {
            if (_.has(fixHeaderCase(requestOptions.headers), "If-None-Match") ||
                _.has(fixHeaderCase(requestOptions.headers), "If-Modified-Since")) {
                console.log("Stripping caching inducing headers for " + requestOptions.path);
            }
        }

        var headers = _.omit(fixHeaderCase(requestOptions.headers), ["If-None-Match", "If-Modified-Since"]);

        requestOptions.headers = headers;
        
        callback(requestOptions);
    });
    
    interceptingProxy.on("interceptResponseContent", function (buffer, responseObject, isSsl, charset, request, callback) {
        persistHttpTransaction(request, responseObject, buffer, options);
        callback(buffer);
    });


    interceptingProxy.on("shouldInterceptResponseContent", function(response, callback) {
        callback(true);
    });
    
    interceptingProxy.on('error', function (error) {
        console.log(error.stack);
    });


    function persistHttpTransaction(req, resp, buf, options) {
        if (options.debug) {
            process.stdout.write(".");
        }

        writeStream.write({ url : stripCacheBuster(req.path),
                                 headers : _.omit(resp.headers, "Content-Encoding"),
                                 statusCode : resp.statusCode,
                                 size : buf.length,
                                 data : buf.toString("base64")
        });}

    process.on('SIGINT', function() {
        console.log("\nClosing '" + file + "'.");
        writeStream.end();
        process.exit();
    });
};

function setupWriteStream(file) {
    var jsonOutputStream = JSONStream.stringify();
  
    var noOpStream = es.mapSync(function(transaction) {
        return transaction;
    });

    var transformFns = _.values(require('require-all')(__dirname + '/transforms'));

    _.reduce(transformFns, function(memo, transform) {
        return memo.pipe(transform());
    }, noOpStream)
    .pipe(jsonOutputStream)
    .pipe(fs.createWriteStream(file));
          
    return noOpStream;
}

function stripCacheBuster(url) {
    return url.replace(/\?_=\d*$/, "");
}
