var assert = require("assert"),
    http = require("http"),
    fs = require("fs"),
    Q = require("q"),
    temp = require("temp").track(),
    offly = require("./app-under-test");

describe('offly e2e', function() {
    var server;
    var PORT = 9615;
    var dumpFile;

    beforeEach(function() {
        dumpFile = temp.openSync().path;
    });

    afterEach(function() {});

    it('should proxy response', function(done) {
        startContentServer()
        .then(function() {
            return offly.start(['dump', '--file', dumpFile]);
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
                res.on('data', function (chunk) {
                    assert.equal("doooh", chunk);
                    deferred.resolve();
                });
            });
            
            return deferred.promise;
        })
        .then(function() {
            return offly.stop();
        })
        .then(function() {
            return stopContentServer();
        })
        .then(function() {
            done();
        });
    });

    it('should persist response', function(done) {
        startContentServer()
        .then(function() {
            return offly.start(['dump', '--file', dumpFile]);
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
            return stopContentServer();
        })
        .then(function() {
            var x = fs.readFileSync(dumpFile, 'utf-8');
            var data = new Buffer(JSON.parse(x)['/'].data, 'base64');
            assert.equal("doooh", data);
            done();
        });
    });
    
    it('should serve saved response in dump file', function(done) {
        startContentServer()
        .then(function() {
            return offly.start(['dump', '--file', dumpFile]);
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
            return offly.start(['serve', '--file', dumpFile]);
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
                res.on('data', function (chunk) {
                    assert.equal("doooh", chunk);
                    deferred.resolve();
                });
            });
            
            return deferred.promise;
        })
        .then(function() {
            return offly.stop();
        })
        .then(function() {
              done();
        });
    });



    function startContentServer() {
        server = http.createServer(function (req, res) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end("doooh");
        });

        var deferred = Q.defer();

        server.on('listening', function() {
            deferred.resolve();
        });

        server.listen(PORT);

        return deferred.promise;
    }

    function stopContentServer() {
        var deferred = Q.defer();

        server.close(function() {
            deferred.resolve();
        });

        return deferred.promise;
    }
})