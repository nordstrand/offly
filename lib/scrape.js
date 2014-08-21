/*jshint node: true */

var offly = require("../test/app-under-test"),
    spawn = require('child_process').spawn,
    parseURL = require("url").parse,
    wd = require('wd'),
    Q = require('q'),
    _ = require('underscore'),
    phantomjs = require('phantomjs'),
    phantomPath = phantomjs.path,
    common = require("./common");


var PHANTOM_WD_PORT = 4444,
    OFFLY_PROXY_PORT = 8128;

var phantom,
    info,
    debug;

exports.start = function(options) {
    setupLogging(options);
    
    var url = options.crawl_url;
    
    if (! _.isString(url) ) {
        throw "URL to scrape not defined";
    }
    
    offly.start(getOfflyParameters(options))
    .then(startupPhantom)
    .then(function() {
        info("Crawling %s", url);
        return getUrls(url);
    })
    .then(function(urls) {
        var fixedUrls = fixupUrls(urls, options);

        fixedUrls.forEach(function(u) {
            debug(" * %s", u);
        });
    
        var deferred = Q.defer();
        return processUrls(fixedUrls , deferred);
    })
    .then(stopPhantom)
    .then(offly.stop)
    .then(info.bind(this, "Scrape finished"));
};


function processUrls(urls, deferred) {
    

    if (urls.length > 0 ) {
        debug("URL:s left:  %s", urls.length);
        var url = urls.pop();
        
        getUrls(url)
        .then(function() {
            processUrls(urls, deferred);
        });
    } else {
        info("All URL:s fetched");
        deferred.resolve();
    }
    
    return deferred.promise;
}

function fixupUrls(urls, options) {
    return _(urls).chain()
        .uniq()
        .filter(httpUriSchemes)
        .filter(onOriginalDomain.bind(this, parseURL(options.crawl_url).hostname))
        .value();
}


function onOriginalDomain(originalHostName, url) {
    return (parseURL(url).hostname === originalHostName);
}

function httpUriSchemes(url) {
    return parseURL(url).protocol == "http:";
}


function getUrls(url) {
    var deferred = Q.defer(),
        urls;
    
    info("Getting: %s", url);
    
    getBrowser()
    .init()
    .get(url)
    .safeEval("var as = document.getElementsByTagName('a');" +
              "var urls = [];"+
              "for (var x = 0; x < as.length; x++) {" +
              "     urls.push(as[x].href);" +
              "}" +
              "urls;")
    .then(function(result) {
        debug("Found %s URL(s) in page", result.length);
        urls = result;
    })
    .quit()
    .then(function() {
        deferred.resolve(urls);
    });
        

    return deferred.promise;
}


function getOfflyParameters(options) {
    var params = ['dump', "--file", options.file, 
                          "--port", OFFLY_PROXY_PORT];
    if (options.debug) {
        params.push("--debug");
    }
    
    return params;
}
function getBrowser() {
    var browser = wd.promiseChainRemote();

    browser.on('status', function(info) {
        debug("WD status:  %s", info);
    });
    browser.on('command', function(eventType, command, response) {
        if (response) {
            response  = response.substring(0, 80);
        }
        debug("WD-command: %s %s \n%s", eventType, command, (response || ''));
    });
    browser.on('http', function(meth, path, data) {
        debug("WD HTTP:    %s %s %s", meth, path, (data || ''));
    });

    return browser;
}

function setupLogging(options) {
    info = common.info(options);
    debug = common.debug(options);
}

function startupPhantom() {

    var deferred = Q.defer();

    var options = ["--webdriver=127.0.0.1:" + 4444,
                                      "--proxy=http://127.0.0.1:" + OFFLY_PROXY_PORT,
                                      "--ignore-ssl-errors=true"];
    info("Starting: %s with parameters: \n%s", phantomPath, JSON.stringify(options));
    phantom = spawn(phantomPath, options);

    phantom.stdout.on('data', function(data) {
        if (data.toString().match(new RegExp("GhostDriver.*running on port " + PHANTOM_WD_PORT))) {
            debug("Phantomjs started on WD-port %s", PHANTOM_WD_PORT);
            deferred.resolve();
        }
    });

    process.on('SIGINT', function() {
        info("\nKilling phantomjs");
        phantom.kill();
    });

    return deferred.promise;
}

function stopPhantom() {
    var deferred = Q.defer();

    phantom.on('exit', function() {
        deferred.resolve();
    });

    phantom.kill("SIGINT");

    return deferred.promise;
}
