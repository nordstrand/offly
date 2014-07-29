
var filternet = require("filternet"),
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    mkdirp = require('mkdirp'),
    urlparse = require('url').parse,
    es = require('event-stream'),
    path = require("path"),
    loadDumpFile = require("./common").loadDumpFile,
    common = require("./common"),
    es = require('event-stream'),
    concat = require('concat-stream');

var info, debug;


exports.start = function(options) {
    setupLogging(options);

    loadDumpFile(options.file)
    .then(function(data) {
        serve(data, options);
    });
};

function serve(data, options) {

    var file = options.file;
    var basePath = path.resolve(options.explode_path);

    info("Serving %s http transaction(s) in file %s on port %s", _.size(data), file, options.port);

    if (options.explode) {
        info("Content in %s will take precedence.", basePath);
    }
    

    var interceptingProxy = filternet.createProxyServer(options);

    interceptingProxy.on("interceptRequest", function (request, response, callback) {


//        if(responseData) {

//            response.writeHead(responseData.statusCode, responseData.headers);
//            if (responseData.size > 0) {
//                var buf;
//                if (options.explode && (buf = getFile(path))) {
//                    var buf = getFile(path, options.debug);
//                    response.write(new Buffer(buf, 'utf-8')); 
//                } else {
//                    response.write(new Buffer(responseData.data, 'base64'));
//                }
//            }

        var transforms = getTransforms(options, data);

        debug("Online pipeline: \n%s",
              _.reduce(transforms, function(memo, transform) { 
                  return memo + "['" + transform.name + "' (" + transform.priority + ")]-> \n"; }, ""));


        var noOpStream = es.mapSync(function(transaction) {
            return transaction;
        });
    
        _.reduce(transforms, function(memo, transform) {
            return memo.pipe(transform.stream);
        }, noOpStream)
        .pipe(concat(function (data) {
            var d = data[0].response;
            
            response.writeHead(d.statusCode, d.headers);
            if (d.data) {
                response.write(d.data);
            }
            response.end();
        }));

        noOpStream.end({
            "request" : request,
            "response" : {}
        });
    });
    
    interceptingProxy.on('error', function (error) {
        console.log(error.stack);
    });
}


var modulesFromDisk = _.memoize(function(options) {
    var transformFns = _.values(require('require-all')(__dirname + '/onlinetransforms'));
    
    if(options.online_transform_dir) {
        transformFns = transformFns.concat(_.values(require("require-all")(__dirname  + "/../" + options.online_transform_dir)));
    }

    return transformFns;
});


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

function setupLogging(options) {
    info = common.info(options);
    debug = common.debug(options);
}

function getTransforms(options, data) {
    var transformFns = modulesFromDisk(options);

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
        
            tfn(f, data, {info : info, debug : debug});
        
            return transform;
    });

    return _.sortBy(transforms, function(transform) { return transform.priority; });
}