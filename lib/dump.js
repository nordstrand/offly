
var filternet = require('filternet'),
    fs = require("fs"),
    JSONStream = require("JSONStream");


var interceptingProxy = filternet.createProxyServer();


exports.start = function(file) {

    var jsonOutputStream = JSONStream.stringifyObject();

    jsonOutputStream.pipe(fs.createWriteStream(file));
    console.log("Spooling http traffic to " + file);

    
    
    interceptingProxy.on("interceptResponseContent", function (buffer, responseObject, isSsl, charset, request, callback) {
        persistHttpTransaction(request, responseObject, buffer);
        callback(buffer);
    });


    interceptingProxy.on("shouldInterceptResponseContent", function(response, callback) {
        callback(true);
    });

    function persistHttpTransaction(req, resp, buf) {
        jsonOutputStream.write([req.path, {
                                            headers : resp.headers,
                                            statusCode : resp.statusCode,
                                            size : buf.length,
                                            data : buf.toString("base64")
    }]);}

    process.on('SIGINT', function() {
        console.log('\nClosing ' + file);
        jsonOutputStream.end();
        process.exit();
    });
};
