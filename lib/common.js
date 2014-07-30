/*jshint node: true */

var fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    es = require('event-stream'),
    concat = require('concat-stream'),
    colors = require('colors');
    Q = require('q');

module.exports = {
    started : function() {
        if (process.send) {
            process.send({status : "started"});
        }
    },
    
    info : function(options) {
        return function(format) {
            if (options.quiet) {
                return;
            }
            
            var index =  1,
                args = arguments;
            console.log(format.replace(/%s/g, function() {
                return args[index++].toString().cyan;
            }));
        };
    },

    debug : function(options) {
        return function(format) {
            if (! options.debug || options.quiet) {
                return;
            }
            
            var index =  1,
                args = arguments;
            console.log(format.replace(/%s/g, function() {
                return args[index++].toString().cyan;
            }));
        };
    },
    loadDumpFile : function(file) {
        var deferred = Q.defer();

//        fs.createReadStream(file)
//        .pipe(JSONStream.parse("*"))
//        .pipe(concat(function(data) {
//            var map = {};
//            _.forEach(data, function(d) {
//                map[d.url] = d;
//            });
//
//            deferred.resolve(map);
//        }));

        setTimeout(function() {
            var data = JSON.parse(fs.readFileSync(file));
            var map = {};
            _.forEach(data, function(d) {
                map[d.url] = d;
            });
            
            deferred.resolve(map);
        }, 0);
        
        return deferred.promise;
    }
};
