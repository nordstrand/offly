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
    var writeStream = setupWriteStream(options);
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
                                 data : buf
        });}

    process.on('SIGINT', function() {
        console.log("\nClosing '" + file + "'.");
        writeStream.end();
        process.exit();
    });
};

function setupWriteStream(options) {
    var jsonOutputStream = JSONStream.stringify();
  
    var noOpStream = es.mapSync(function(transaction) {
        return transaction;
    });

    var transforms = getTransforms();
    
    if (!options.debug) {
        console.log(_.reduce(transforms, function(memo, transform) { return memo + "['" + transform.name + "' (" + transform.priority + ")]-> \n"; }, "Pipeline: \n"));
    }
    
    _.reduce(transforms, function(memo, transform) {
        return memo.pipe(transform.stream);
    }, noOpStream)
    .pipe(jsonOutputStream)
    .pipe(fs.createWriteStream(options.file));
          
    return noOpStream;
}

function getTransforms() {
    var transformFns = _.values(require('require-all')(__dirname + '/transforms'));

    var transforms = _.map(transformFns, function(tfn) {
            var transform = {};
    
            var f = function (r) {
                transform.stream = r;
                return {
                    as: function (a) {
                        transform.name = a;
                        return {
                            atPriority: function (p) {
                                transform.priority = p;
                            }
                        };
                    }
                };
            };
        
            tfn(f);
        
            return transform;
    });

    return _.sortBy(transforms, function(transform) { return transform.priority; });
}

function stripCacheBuster(url) {
    return url.replace(/\?_=\d*$/, "");
}


var fixHeaderCase = function (headers) {
    var result = {};
    for (var key in headers) {
        if (!headers.hasOwnProperty(key)) {
            continue;
        }
        
        var newKey = key.split('-')
                         .map(function(token){ return token[0].toUpperCase()+token.slice(1); })
                         .join('-');
        result[newKey] = headers[key];
    }
    return result;
};