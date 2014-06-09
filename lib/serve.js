
var filternet = require('filternet'),
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    options = require("./options.js"),
    mkdirp = require('mkdirp'),
    urlparse = require('url').parse
    path = require("path"); 


var interceptingProxy = filternet.createProxyServer();


exports.start = function(file) {

    var fileData = fs.readFileSync(file);
    
    var data = JSON.parse(fileData);
    
    console.log("Serving " + _.size(_.keys(data)) + " http transaction in '" + file + "'.");

    if (options.get("explode")) {
        console.log("Exploding to " + basePath);
    
    }
    
    
    interceptingProxy.on("interceptRequest", function (request, response, callback) {
        
        var responseData = data[request.path];
        
        if(responseData) {
            
            if (options.get('debug')) {
                console.log(request.path + " => HTTP " +  responseData.statusCode + " " + responseData.size  + "b");
            }
            response.writeHead(responseData.statusCode, responseData.headers);
            if (responseData.size > 0) {
               
                
                if (options.get("explode")) {
                    var buf = getFile(request.path);
                   console.log("exp"); 
                    if (buf) {
                        response.write(new Buffer(buf, 'utf-8'));
                    } else {
                        explodeFile(request.path, responseData);
                        response.write(new Buffer(responseData.data, 'base64'));
                    }
                } else {
                    response.write(new Buffer(responseData.data, 'base64'));
                }
                
            }
            
       
            
        } else {
            console.log(request.path + " => NOT FOUND");  
            response.writeHead(404, "Not found by offly");
        }
        
        response.end();
    });
};

var basePath = path.resolve(options.get("explode_path"));
    

function getFile(url) {
    var filePath = path.join(basePath, urlparse(url).pathname);
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
    } else {
        return undefined;
    }
}

function explodeFile(url, data) {

    console.log(basePath);
    
    var folder = urlparse(url).pathname.match(/.*\//)[0];

    var resolveFolder = path.join(basePath, folder);
    
    console.log("resolved " + resolveFolder);
    
    mkdirp.sync(resolveFolder);
    
    var filePath = path.join(basePath, urlparse(url).pathname);
    
    console.log("file path " + filePath);
    if (filePath == resolveFolder) {
        filePath = filePath + "index.html";
    }
    fs.writeFileSync(filePath, new Buffer(data.data, 'base64'));
}
