

var c = require("child_process"),
    Q = require('q'),
    temp = require("temp").track();

var child;

module.exports = {

    start : function (args) {
        var opts = {
            cwd : __dirname + "/.."
        };

        var deferred = Q.defer();
        
        child = c.fork("index", args, opts);
        child.on('message', function(data) {
            deferred.resolve();
        });

        return deferred.promise;
    },
    
    // idempotent
    stop : function() {
        var deferred = Q.defer();

        if (child) {
            child.on('exit', function() {
                deferred.resolve();
            });

            child.kill('SIGINT');
            child = undefined;
        } else {
            setTimeout(function() {
                deferred.resolve();
            }, 0);
        }

        return deferred.promise;
    }
}
