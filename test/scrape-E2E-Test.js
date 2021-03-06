/*jshint node: true, mocha : true */

var http = require("http"),
    _ = require('underscore'),
    fs = require('fs'),
    Q = require("q"),
    temp = require("temp").track(),
    offly = require("./app-under-test"),
    getLocalIp = require("./test-utils").getLocalIp,
    e2e = require("./test-utils").it2,
    expect = require('chai').expect;

describe("offly scrape", function() {
    
    this.timeout(5000);

    var HTTP_CONTENT_SERVER_PORT = 9616,
        httpServer,
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
        stopHttpContentServer()
        .then(done);
    });

    e2e("should scrape single url", function() {
        return startHttpContentServer()
        .then(function() {

            return offly.startupAndWaitForTermination(["scrape",
                                "--crawl_url=http://" + localIp + ":" + HTTP_CONTENT_SERVER_PORT,
                               dumpFile
                                ]);
        })
        .then(function() {
            var x = JSON.parse(fs.readFileSync(dumpFile, "utf-8"));
            expect(x.length).to.equal(1);
        });
    });
    
    e2e("should scrape recursively", function() {
        return startHttpContentServer()
        .then(function() {
            return offly.startupAndWaitForTermination(["scrape",
                                "--crawl_url=http://" + localIp + ":" + HTTP_CONTENT_SERVER_PORT,
                                "--recursive",
                                dumpFile
                                ]);
        })
        .then(function() {
            var x = JSON.parse(fs.readFileSync(dumpFile, "utf-8"));
            expect(x.length).to.equal(3);
            expect(_.pluck(x, 'url')).to.include("/", "/a", "/b");
        });
    });
    
    e2e("should make href url:s relative when scraping recursively", function() {
        return startHttpContentServer()
        .then(function() {
            return offly.startupAndWaitForTermination(["scrape",
                                "--crawl_url=http://" + localIp + ":" + HTTP_CONTENT_SERVER_PORT,
                                "--recursive",
                                dumpFile
                                ]);
        })
        .then(function() {
            var x = JSON.parse(fs.readFileSync(dumpFile, "utf-8"));
            expect(new Buffer(x[0].data, 'base64').toString()).to.contain('href="/a"');
        });
    });
    
    
    e2e("should keep href url:s intact when not scraping recursively", function() {
        return startHttpContentServer()
        .then(function() {
            return offly.startupAndWaitForTermination(["scrape",
                                "--crawl_url=http://" + localIp + ":" + HTTP_CONTENT_SERVER_PORT,
                                dumpFile
                                ]);
        })
        .then(function() {
            var x = JSON.parse(fs.readFileSync(dumpFile, "utf-8"));
            expect(new Buffer(x[0].data, 'base64').toString()).not.to.contain('href="/a"');
        });
    });
    
    e2e("should crawl urls matching include", function() {       
        return startHttpContentServer()
        .then(function() {
            return offly.startupAndWaitForTermination(["scrape",
                                "--crawl_url=http://" + localIp + ":" + HTTP_CONTENT_SERVER_PORT,
                                "--recursive",
                                "--include=a",
                                dumpFile
                                ]);
        })
        .then(function() {
            var x = JSON.parse(fs.readFileSync(dumpFile, "utf-8"));
            expect(x.length).to.equal(2);
            expect(_.pluck(x, 'url')).to.include("/", "/a");
            expect(_.pluck(x, 'url')).not.to.include("/b");
        });
    });
    
    
    e2e("should not crawl urls matching exclude", function() {
        return startHttpContentServer()
        .then(function() {
            return offly.startupAndWaitForTermination(["scrape",
                                "--crawl_url=http://" + localIp + ":" + HTTP_CONTENT_SERVER_PORT,
                                "--recursive",
                                "--exclude=a",
                                dumpFile
                                ]);
        })
        .then(function() {
            var x = JSON.parse(fs.readFileSync(dumpFile, "utf-8"));
            expect(x.length).to.equal(2);
            expect(_.pluck(x, 'url')).to.include("/", "/b");
            expect(_.pluck(x, 'url')).not.to.include("/a");
        });
    });

    function startHttpContentServer(serverDefinition) {
        serverDefinition = serverDefinition || function (req, res) {
            res.writeHead(200, {"Content-Type": "text/html"});
            var start = "<html><body><p>ssl doh</p>";
            if (req.url === "/") {
                start = start + 
                    "<p><a href='http://" + localIp + ":" + HTTP_CONTENT_SERVER_PORT +"/a'>a</a></p>" +
                    "<p><a href='/b'>b</a></p>";
            }
            
            res.end(start + "</body></html>");
        };
        
        var deferred = Q.defer();

        httpServer = http.createServer(serverDefinition);

        httpServer.on("listening", function() {
            deferred.resolve();
        });

        httpServer.listen(HTTP_CONTENT_SERVER_PORT);
        return deferred.promise;
    }
    
    function stopHttpContentServer() {
        var deferred = Q.defer();

        if (httpServer) {
            httpServer.close(function() {
                deferred.resolve();
            });
            httpServer = undefined;
        } else {
            setTimeout(function() { deferred.resolve(); }, 0);
        }

        return deferred.promise;
    }
});
