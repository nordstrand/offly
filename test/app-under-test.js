

var c = require("child_process"),
    Q = require('q'),
    temp = require("temp").track();

var child;

module.exports = {

    start : function (args) {
        var opts = {
            cwd : __dirname + "/.."
        };
        
        child = c.fork("index", args, opts);
            
        var deferred = Q.defer();
        
        child.on('message', function(data) {
            deferred.resolve();
        });

        return deferred.promise;
    },
    
    stop : function() {
        var deferred = Q.defer();
        
        child.on('exit', function() {
            deferred.resolve();
        });

        child.kill('SIGINT');
       // child.kill('SIGTERM');
        return deferred.promise;
    }
}