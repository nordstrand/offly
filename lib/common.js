
var fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    es = require('event-stream'),
    concat = require('concat-stream'),
    Q = require('q');

module.exports = {
    started : function() {
        if (process.send) {
            process.send({status : "started"});
        }
    },

    loadDumpFile : function(file) {
        var deferred = Q.defer();

        fs.createReadStream(file)
        .pipe(JSONStream.parse("*"))
        .pipe(concat(function(data) {
            var map = {};
            _.forEach(data, function(d) {
                map[d.url] = d;
            });

            deferred.resolve(map);
        }));

        return deferred.promise;
    }
};
