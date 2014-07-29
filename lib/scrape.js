var offly = require("../test/app-under-test");
    options = require("./options"),
    spawn = require('child_process').spawn,
    parseURL = require("url").parse,
    wd = require('wd'),
    Q = require('q'),
    colors = require('colors'),
    _ = require('underscore'),
    phantomjs = require('phantomjs'),
    phantomPath = phantomjs.path,
    common = require("./common");


var PHANTOM_WD_PORT = 4444;
var OFFLY_PROXY_PORT = 8128;

var log, debug;

exports.start = function(options) {
    setupLogging(options);
    
    var url = options.crawl_url;
    
    if (! _.isString(url) ) {
        throw "URL to scrape not defined";
    }
    
    startupPhantom()
    .then(function() {
        return offly.start(['dump', '--file', options.file]);
    })
    .then(function() {
        info("Crawling %s", url);
        return getUrls(url);
    })
    .then(function(urls) {
        var fixedUrls = fixupUrls(urls, options);

        fixedUrls.forEach(function(u) {
            info(" * %s", u);
        });

        info(fixedUrls.length);

        processUrls(fixedUrls);
    });
};


function processUrls(urls) {
  
    if (urls.length > 0 ) {
        info("URLS left:  %s", urls.length);
        var url = urls.pop();
        getUrls(url)
        .then(function() {
            processUrls(urls);
        });
    } else {
        info("we are done");
    }
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

function articles(url) {
    if (! parseURL(url).path) {
        return false;
    }
    return (parseURL(url).path.toString().match(/article[0-9]*\.ab$/));
}

function startupPhantom() {

    var deferred = Q.defer();

    info("Starting: %s", phantomPath);
    var phantom = spawn(phantomPath, ["--webdriver=127.0.0.1:" + PHANTOM_WD_PORT,
                                      "--proxy=http://127.0.0.1:" + OFFLY_PROXY_PORT ]);

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



function getUrls(url) {

    var deferred = Q.defer();
    
    info("Getting: %s", + url);

    getBrowser()
    .init()
    .get(url)
    .title()
    .then(function(a, b) { console.log( a + "-" + b); })
    .safeEval("var as = document.getElementsByTagName('a');" +
              "var urls = [];"+
              "for (var x = 0; x < as.length; x++) {" +
              "     urls.push(as[x].href);" +
              "}" +
              "urls;")
    .then(function(a, b) { 
        deferred.resolve(a);
    })
    .quit();

    return deferred.promise;
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
