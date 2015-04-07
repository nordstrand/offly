/*jshint node: true */

var dns = require('dns'),
    Q = require("q");

module.exports = {
    getTransformStream: function (stream) {
        var filt;

        var f = function (r) {
            filt = r;
            return {
                as: function () {
                    return {
                        atPriority: function () {}
                    };
                }
            };
        };

        stream(f);

        return filt;
    },
    
    getLocalIp: function() {
        var deferred = Q.defer();
        dns.lookup(require('os').hostname(), function (err, add) {
            deferred.resolve(add);
        });
        return deferred.promise;
   },
    
    wrapAsyncPromise: function (done, f) {
        f()
        .then(function() {
            done();
        })
        .catch(function(e) {
            done(e);
        });
    }
};