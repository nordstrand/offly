/*jshint node: true */

var filternet = require("./filternet/"),
    _ = require("underscore"),
    es = require('event-stream'),
    path = require("path"),
    loadDumpFile = require("./common").loadDumpFile,
    common = require("./common"),
    es = require('event-stream'),
    concat = require('concat-stream'),
    cheerio = require('cheerio'),
    pretty = require('prettysize');

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
    
    printInfoToConsole(data, options);

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

function printInfoToConsole(data, options) {
    var basePath = path.resolve(options.explode_path),
        file = options.file;
    
    var transactions = _(_.values(data)).chain()
        .filter(isHtml)
        .where({statusCode : 200})
        .sortBy("size")
        .reverse()
        .value()
        .slice(0, 3);

    _.forEach(transactions, function(transaction) {

        info("'%s' [%s] \n%s", getTitle(transaction),
                pretty(transaction.size),
                "http://localhost:" + options.port + transaction.url);
        info("");
    });
    
    info("Serving %s http transaction(s) in file %s on port %s", _.size(data), file, options.port);

    if (options.explode) {
        info("Content in %s will take precedence.", basePath);
    }
}

function getTitle(transaction) {
    var $ = cheerio.load(new Buffer(transaction.data, 'base64').toString());
    return $("title").text().trim();
}

function isHtml(t) {
    return t.headers &&
           t.headers["Content-Type"] &&
           t.headers["Content-Type"].indexOf("text/html") != -1;
}