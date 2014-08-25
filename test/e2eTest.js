/*jshint node: true, mocha : true */

var assert = require("assert"),
    http = require("http"),
    fs = require("fs"),
    Q = require("q"),
    temp = require("temp").track(),
    offly = require("./app-under-test");

describe("offly e2e", function() {

    var CONTENT_SERVER_PORT = 9615,
        OFFLY_PORT = 8128,
        server,
        dumpFile;


    beforeEach(function() {
        dumpFile = temp.openSync().path;
    });

    afterEach(function(done) {
        stopContentServer()
        
        .then(function() { return offly.stop(); })
        .then(done);
    });

    it("should proxy response", function(done) {
        wrapAsyncPromise(done, function() {
            return startContentServer()
            .then(function() {
                return offly.start(["dump", "--file", dumpFile]);
            })
            .then(function() {
                var options = {
                    host: "localhost",
                    port: OFFLY_PORT,
                    path: "http://localhost:" + CONTENT_SERVER_PORT
                };

                var deferred = Q.defer();
                http.get(options, function(res) {
                    assert.equal(200, res.statusCode);
                    res.on("data", function (chunk) {
                        assert.equal("doooh", chunk);
                        deferred.resolve();
                    });
                });

                return deferred.promise;
            });
        });
    });

    it("should proxy response on custom port", function(done) {
        wrapAsyncPromise(done, function() {
            return startContentServer()
            .then(function() {
                return offly.start(["dump", "--file", dumpFile, "--port", 3001]);
            })
            .then(function() {
                var options = {
                    host: "localhost",
                    port: 3001,
                    path: "http://localhost:" + CONTENT_SERVER_PORT
                };

                var deferred = Q.defer();
                http.get(options, function(res) {
                    assert.equal(200, res.statusCode);
                    res.on("data", function (chunk) {
                        assert.equal("doooh", chunk);
                        deferred.resolve();
                    });
                });

                return deferred.promise;
            });
        });
    });

    it("should persist response", function(done) {
        wrapAsyncPromise(done, function() {
            return startContentServer()
            .then(function() {
                return offly.start(["dump", "--file", dumpFile]);
            })
            .then(function() {
                var options = {
                    host: "localhost",
                    port: OFFLY_PORT,
                    path: "http://localhost:" + CONTENT_SERVER_PORT
                };

                var deferred = Q.defer();

                http.get(options, function(res) {
                    deferred.resolve();
                });

                return deferred.promise;
            })
            .then(function() {
                return offly.stop();
            })
            .then(function() {
                var x = fs.readFileSync(dumpFile, "utf-8");
                var data = new Buffer(JSON.parse(x)[0].data, "base64");
                assert.equal("doooh", data);
            });
        });
    });
    
    it("should normalize header capitalization on persist", function(done) {
        wrapAsyncPromise(done, function() {
            return startContentServer(function (req, res) {
                res.writeHead(200, {"ConTent-type": "text/plain"});
                res.end("doooh");
            })
            .then(function() {
                return offly.start(["dump", "--file", dumpFile]);
            })
            .then(HTTP_GET)
            .then(function() {
                return offly.stop();
            })
            .then(function() {
                var x = fs.readFileSync(dumpFile, "utf-8");
                var headerValue = JSON.parse(x)[0].headers["Content-Type"];
                assert.equal("text/plain", headerValue);
            });
        });
    });

    it("should append existing file if --append is used", function(done) {
        wrapAsyncPromise(done, function() {
            return startContentServer(function (req, res) {
                res.writeHead(200, {"Content-type": "text/plain"});
                res.end("doooh");
            })
            .then(function() {
                return offly.start(["dump", "--file", dumpFile]);
            })
            .then(HTTP_GET)
            .then(function() {
                return offly.stop();
            })
            .then(function() {
                return offly.start(["dump", "--file", dumpFile, "--append"]);
            })
            .then(HTTP_GET)
            .then(function() {
                return offly.stop();
            })
            .then(function() {
                var x = fs.readFileSync(dumpFile, "utf-8");
                var entries = JSON.parse(x).length;
                assert.equal(2, entries);
            });
        });
    });


    it("should serve saved response in dump file", function(done) {
        wrapAsyncPromise(done, function() {
            return startContentServer()
            .then(function() {
                return offly.start(["dump", "--file", dumpFile]);
            })
            .then(HTTP_GET)
            .then(function() {
                return stopContentServer();
            })
            .then(function() {
                return offly.stop();
            })
            .then(function() {
                return offly.start(["serve", "--file", dumpFile]);
            })
            .then(function() {
                var options = {
                    host: "localhost",
                    port: OFFLY_PORT,
                    path: "http://localhost:" + CONTENT_SERVER_PORT
                };

                var deferred = Q.defer();
                http.get(options, function(res) {
                    assert.equal(200, res.statusCode);
                    res.on("data", function (chunk) {
                        assert.equal("doooh", chunk);
                        deferred.resolve();
                    });
                });

                return deferred.promise;
            });
        });
    });


    it("should override content of dump file in exploded mode if matching file found", function(done) {
        
        var explodepath = temp.mkdirSync();
        
        fs.writeFileSync(explodepath+"/abc", "file content");
        
        wrapAsyncPromise(done, function() {
            return startContentServer()
            .then(function() {
                return offly.start(["dump", "--file", dumpFile]);
            })
            .then(function() {
                return HTTP_GET( "http://localhost:" + CONTENT_SERVER_PORT + "/abc");
            })
            .then(function() {
                return stopContentServer();
            })
            .then(function() {
                return offly.stop();
            })
            .then(function() {
                return offly.start(["serve",
                                    "--file", dumpFile,
                                    "--explode",
                                    "--explode_path", explodepath]);
            })
            .then(function() {
                var options = {
                    host: "localhost",
                    port: OFFLY_PORT,
                    path: "http://localhost:" + CONTENT_SERVER_PORT + "/abc"
                };

                var deferred = Q.defer();
                http.get(options, function(res) {
                    assert.equal(200, res.statusCode);
                    res.on("data", function (chunk) {
                        assert.equal("file content", chunk);
                        deferred.resolve();
                    });
                });

                return deferred.promise;
            });
        });
    });

    function startContentServer(serverDefinition) {
        server = http.createServer(serverDefinition || function (req, res) {
            res.writeHead(200, {"Content-Type": "text/plain"});
            res.end("doooh");
        });

        var deferred = Q.defer();

        server.on("listening", function() {
            deferred.resolve();
        });

        server.listen(CONTENT_SERVER_PORT);

        return deferred.promise;
    }

    function stopContentServer() {
        var deferred = Q.defer();

        if (server) {
            server.close(function() {
                deferred.resolve();
            });
            server = undefined;
        } else {
            setTimeout(function() { deferred.resolve(); }, 0);
        }

        return deferred.promise;
    }

    function HTTP_GET(url, cb) {
        url = url || "http://localhost:" + CONTENT_SERVER_PORT;
        cb = cb || function() {
            deferred.resolve();
        };
        
        var options = {
            host: "localhost",
            port: OFFLY_PORT,
            path: url
        };

        var deferred = Q.defer();

        http.get(options, cb);

        return deferred.promise;
    }
    
    function wrapAsyncPromise(done, f) {
        f()
        .then(function() {
            done();
        })
        .catch(function(e) {
            done(e);
        });
    }
});
