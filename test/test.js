var assert = require("assert"),
    http = require("http"),
    fs = require("fs"),
    Q = require("q"),
    temp = require("temp").track(),
    offly = require("./app-under-test");

describe("offly e2e", function() {
    var server;
    var PORT = 9615;
    var dumpFile;

    beforeEach(function() {
        dumpFile = temp.openSync().path;
    });

    afterEach(function(done) {
        stopContentServer()
        .then(function() { return offly.stop(); })
        .then(function() { done(); });
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
                    port: 8128,
                    path: "http://localhost:" + PORT
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
                    port: 8128,
                    path: "http://localhost:" + PORT
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
            .then(function() {
                var options = {
                    host: "localhost",
                    port: 8128,
                    path: "http://localhost:" + PORT
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
                var headerValue = JSON.parse(x)[0].headers["Content-Type"];
                assert.equal("text/plain", headerValue);
            });
        });
    });

    it("should serve saved response in dump file", function(done) {
        wrapAsyncPromise(done, function() {
            return startContentServer()
            .then(function() {
                return offly.start(["dump", "--file", dumpFile]);
            })
            .then(function() {
                var options = {
                    host: "localhost",
                    port: 8128,
                    path: "http://localhost:" + PORT
                };

                var deferred = Q.defer();

                http.get(options, function(res) {
                    deferred.resolve();
                });

                return deferred.promise;
            })
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
                    port: 8128,
                    path: "http://localhost:" + PORT
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



    function startContentServer(serverDefinition) {
        server = http.createServer(serverDefinition || function (req, res) {
            res.writeHead(200, {"Content-Type": "text/plain"});
            res.end("doooh");
        });

        var deferred = Q.defer();

        server.on("listening", function() {
            deferred.resolve();
        });

        server.listen(PORT);

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

    function wrapAsyncPromise(done, f) {
        f()
        .then(function() {
            done();
        })
        .catch(function(e) {
            done(e);
        });
    }
})
