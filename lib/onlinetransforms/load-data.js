var es = require("event-stream"),
    _  = require("underscore");

module.exports = function (register, ctx) {
    
    var log = ctx.log,
        data = ctx.data;

    var stream = es.mapSync(function (d) {
        
        var request = d.request;
        var response = d.response;
        
        var persistedHttpTransaction = data[request.path];

        if (persistedHttpTransaction) {

            log.debug("%s => %s %sb",
                      request.path,
                      persistedHttpTransaction.statusCode,
                      persistedHttpTransaction.size);

            response.statusCode = persistedHttpTransaction.statusCode;
            response.headers = _.omit(persistedHttpTransaction.headers, "Content-Encoding");

            if (persistedHttpTransaction.size > 0) {
                response.data = persistedHttpTransaction.data;
            }

        } else {
            log.info("%s => %s", request.path, "NOT FOUND");
            response.statusCode = 404;
        }

        return d;
    });

    register(stream).as("load data").atPriority(10);
};