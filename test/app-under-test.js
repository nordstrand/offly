/*jshint node: true */

var c = require("child_process"),
    Q = require("q"),
    _ = require("underscore");

var child;



module.exports = {

    start : function (args) {
        var opts = {
            cwd : __dirname + "/..",
        };

        var deferred = Q.defer();
      
        child = c.fork("index", args.concat("--quiet"), opts);
        
        
        child.on('message', function() {
            deferred.resolve();
        });

        return deferred.promise;
    },

    startupAndWaitForTermination : function (args) {
        var opts = {
            cwd : __dirname + "/..",
           
        };

        var deferred = Q.defer();
        
        var child2 = c.fork("index", args.concat("--quiet"), opts);
        
        child2.on('exit', function() {
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
};
