/*jshint node: true, mocha : true */

var spawn = require('child_process').spawn,
    https = require("https"),
    pem = require('pem'),
    phantomjs = require('phantomjs'),
    phantomPath = phantomjs.path,
    Q = require("q"),
    wd = require('wd'),
    temp = require("temp").track(),
    fs = require("fs"),
    e2e = require("./test-utils").it2,
    offly = require("./app-under-test"),
    getLocalIp = require("./test-utils").getLocalIp,
    expect = require('chai').expect;

describe("offly SSL dump", function() {

    this.timeout(5000);
    
    var HTTPS_CONTENT_SERVER_PORT = 9616,
        OFFLY_PORT = 8128,
        PHANTOM_WD_PORT = 4444,
        httpsServer,
        dumpFile,
        phantom,
        localIp;

    before(function(done) {
        getLocalIp()
        .then(function(addr) {
            //PhantomJS 1.9.7 will ignore a configured proxy when fetching content from 
            //localhost/127.0.0.1 bypassing offly, 
            //thus we have to look up the IP of the interface the dummy content server 
            //is listening on
            localIp = addr;
        })
        .then(done);
    });

    beforeEach(function() {
        dumpFile = temp.openSync().path;
    });

    afterEach(function(done) {
        stopHttpsContentServer()
        .then(function() { return offly.stop(); })
        .then(stopPhantom)
        .then(done);
    });

    e2e("should proxy response", function() {
        return startHttpsContentServer()
        .then(function() {
            return offly.start(["dump",
                                "--sslDomain", "*",
                               dumpFile]);
        })
        .then(startupPhantom)
        .then(function() {
            return getUrl("https://" + localIp + ":" + HTTPS_CONTENT_SERVER_PORT);
        })
        .then(function(body) {
            expect(body).to.equal("ssl doh");
        })
        .then(function() {
            return offly.stop();
        })
        .then(function() {
            expect(JSON.parse(fs.readFileSync(dumpFile, "utf-8")).length).to.equal(1);
        });
    });

    function startupPhantom() {
        var deferred = Q.defer();

        phantom = spawn(phantomPath, ["--webdriver=127.0.0.1:" + PHANTOM_WD_PORT,
                                      "--proxy=http://127.0.0.1:" + OFFLY_PORT,
                                      "--ssl-protocol=any",
                                      "--ignore-ssl-errors=true"]);

        phantom.stdout.on('data', function(data) {
            if (data.toString().match(new RegExp("GhostDriver.*running on port " + PHANTOM_WD_PORT))) {
                deferred.resolve();
            }
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
    
    function startHttpsContentServer(serverDefinition) {
        serverDefinition = serverDefinition || function (req, res) {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end("<html><body><p>ssl doh</p></body></html>");
        };
        
        var deferred = Q.defer();
        
        pem.createCertificate({days : 1, selfSigned:true, commonName : 'dooh.org'},
            function(err, keys) {
                httpsServer = https.createServer({key: keys.serviceKey, cert: keys.certificate}, 
                    serverDefinition);
                
                httpsServer.on("listening", function() {
                    deferred.resolve();
                });

                httpsServer.listen(HTTPS_CONTENT_SERVER_PORT);

        });

        return deferred.promise;
    }
    
    function stopHttpsContentServer() {
        var deferred = Q.defer();

        if (httpsServer) {
            httpsServer.close(function() {
                deferred.resolve();
            });
            httpsServer = undefined;
        } else {
            setTimeout(function() { deferred.resolve(); }, 0);
        }

        return deferred.promise;
    }
    
    function getUrl(url) {
        var deferred = Q.defer();

        getBrowser()
        .init()
        .get(url)
        .safeEval("console.log(document.body.innerText); document.body.innerText;")
        .then(function(a) { 
            deferred.resolve(a);
        })
        .quit();

        return deferred.promise;
    }

    function getBrowser() {
        var browser = wd.promiseChainRemote();

//        browser.on('status', function(info) {
//            console.log("WD status:  %s", info);
//        });
//        browser.on('command', function(eventType, command, response) {
//            if (response) {
//                response  = response.substring(0, 80);
//            }
//            console.log("WD-command: %s %s \n%s", eventType, command, (response || ''));
//        });
//        browser.on('http', function(meth, path, data) {
//            console.log("WD HTTP:    %s %s %s", meth, path, (data || ''));
//        });

        return browser;
    }
});
