/**
 *  encodes the data/body buffer  of the the http response
 *
 */
var es = require('event-stream');
  

module.exports = function (register) {
    var stream = es.mapSync(function (httpTransaction) {
        httpTransaction.data = httpTransaction.data.toString("base64")
        return httpTransaction;
    });
    
    register(stream).as("encode data before serialization").atPriority(1000);
}