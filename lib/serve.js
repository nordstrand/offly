
var filternet = require('filternet'),
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore");


var interceptingProxy = filternet.createProxyServer();


exports.start = function(file) {

    var fileData = fs.readFileSync(file);
    
    var data = JSON.parse(fileData);
    
    console.log("Serving " + _.size(_.keys(data)) + " http transaction in '" + file + "'.");

    
    interceptingProxy.on("interceptRequest", function (request, response, callback) {
        
        var responseData = data[request.path];
        
        if(responseData) {
            console.log(request.path + " => HTTP " +  responseData.statusCode + " " + responseData.size  + "b");
            
            response.writeHead(responseData.statusCode, responseData.headers);
            if (responseData.size > 0) {
                response.write(new Buffer(responseData.data, 'base64'));
            }
            
            response.end();
        } else {
             console.log(request.path + " => NOT FOUND");   
        }
    });
};
