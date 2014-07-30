/*jshint node: true */

var filternet = require("filternet"),
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    temp = require("temp").track(),
    es = require('event-stream'),
    common = require("./common");


var debug,info;

function startProxy(options) {
    if ( ! options.sslDomain ) {
        debug("Starting non SSL proxy on port %s",  options.port);
        
        
        return filternet.createProxyServer(options);
        
    } else {
        
        var sslCerts = {};

        sslCerts[options.sslDomain] = [ options.sslKeyFile, options.sslCrtFile];
        var socketDir = temp.mkdirSync(require("../package.json").name + "-");

        debug("Starting SSL proxy, will intercept requests for %s,  socket directory is %s",
              options.sslDomain,
              socketDir);
        

        return filternet.createProxyServer({ 
                                     sslCerts: sslCerts,
                                     sslSockDir: socketDir,
        });
    }
}

exports.start = function(options) {
    setupLogging(options);
    
    var file = options.file;
    var writeStream = setupWriteStream(options);
    var interceptingProxy = startProxy(options);

    info("Dumping http traffic to %s.", file);
    
    
    interceptingProxy.on("interceptRequest", function (requestOptions, wtf, callback) {
        
        
        
        if (_.has(fixHeaderCase(requestOptions.headers), "If-None-Match") ||
            _.has(fixHeaderCase(requestOptions.headers), "If-Modified-Since")) {
            debug("Stripping caching inducing headers for %s ", requestOptions.path);
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
        info("\nClosing %s",  file);
        writeStream.end();
        process.exit();
    });
};

function setupLogging(options) {
    info = common.info(options);
    debug = common.debug(options);
}

function setupWriteStream(options) {
    var jsonOutputStream = JSONStream.stringify();
  
    var noOpStream = es.mapSync(function(transaction) {
        return transaction;
    });

    var transforms = getTransforms(options);
    
    debug("Pipeline:  \n%s",
          _.reduce(transforms,
                   function(memo, transform) {
                       return memo +
                           "['" + transform.name + "' (" + transform.priority + ")]-> \n";
                   }, 
                   ""));

    
    _.reduce(transforms, function(memo, transform) {
        return memo.pipe(transform.stream);
    }, noOpStream)
    .pipe(jsonOutputStream)
    .pipe(fs.createWriteStream(options.file));
          
    return noOpStream;
}

function getTransforms(options) {
    var transformFns = _.values(require("require-all")(__dirname + "/transforms"));
    
    if(options.transform_dir) {
        transformFns = transformFns.concat(_.values(require("require-all")(__dirname  + "/../" + options.transform_dir)));
    }

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
        /*jshint loopfunc: true */
        var newKey = key.split('-')
                         .map(function(token){ return token[0].toUpperCase()+token.slice(1); })
                         .join('-');
        result[newKey] = headers[key];
    }
    return result;
};