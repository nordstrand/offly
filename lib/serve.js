/*jshint node: true */

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
        return serve(data, options);
    })
    .then(common.started);
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
    
    return interceptingProxy.isListening;
}


var modulesFromDisk = _.memoize(function(options) {
    var transformFns = _.values(require('require-all')(__dirname + '/onlinetransforms'));
    
    if(options.online_transform_dir) {
        transformFns = transformFns.concat(_.values(require("require-all")(__dirname  + "/../" + options.online_transform_dir)));
    }

    return transformFns;
});


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
        
            tfn(f, {
                    log     : {info : info, debug : debug},
                    data    : data,
                    options : options
                    });
        
            return transform;
    });

    return _.sortBy(transforms, function(transform) { return transform.priority; });
}