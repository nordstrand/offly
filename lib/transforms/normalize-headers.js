/*jshint node: true, loopfunc: true */

/**
 *  Normalizes HTTP headers
 *
 *  E.G.: "content-Type: text/plain" => "Content-Type: text/plain"
 */
var es = require("event-stream"),
     _ = require("underscore");

module.exports = function(register) {

   var stream = es.mapSync(function(httpTransaction) {
        httpTransaction.headers = fixHeaderCase(httpTransaction.headers);
        return httpTransaction;
   });


    register(stream).as("normalize http headers").atPriority(1);
};


var fixHeaderCase = function (headers) {
    var result = {};
    for (var key in headers) {
        if (!headers.hasOwnProperty(key)) {
            continue;
        }
        
        var newKey = key.split('-')
                         .map(function(token){ return token[0].toUpperCase()+token.slice(1); })
                         .join('-');
        result[newKey] = headers[key];
    }
    return result;
};