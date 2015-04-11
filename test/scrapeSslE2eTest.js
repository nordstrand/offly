/*jshint node: true, mocha : true */

var
    https = require("https"),
    pem = require('pem'),
    fs = require('fs'),
    Q = require("q"),
    temp = require("temp").track(),
    offly = require("./app-under-test"),
    getLocalIp = require("./test-utils").getLocalIp,
    wrapAsyncPromise = require("./test-utils").wrapAsyncPromise,
    expect = require('chai').expect;

describe("offly e2e scrape of ssl site", function() {

    var HTTPS_CONTENT_SERVER_PORT = 9616,
        httpsServer,
        dumpFile,
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
        .then(done);
    });

    it("should scrape single url", function(done) {
        this.timeout(5000);
        wrapAsyncPromise(done, function() {
            return startHttpsContentServer()
            .then(function() {
                
                return offly.startupAndWaitForTermination(["scrape",
                                    "--crawl_url=https://" + localIp + ":" + HTTPS_CONTENT_SERVER_PORT,
                                    dumpFile
                                    ]);
            })
            .then(function() {
                var x = JSON.parse(fs.readFileSync(dumpFile, "utf-8"));
                expect(x.length).to.equal(1);
            });
        });
    });
    

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
});
