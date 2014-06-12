
var 
    fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    options = require("./options.js"),
    mkdirp = require('mkdirp'),
    urlparse = require('url').parse
    path = require("path"); 


var basePath = path.resolve(options.get("explode_path"));
    

module.exports = function(file) {
    var jsonData = JSON.parse(fs.readFileSync(file));
    
    console.log("Exploding " + _.size(_.keys(jsonData)) + " http transaction in '" + file + "' to '" +
                basePath + "'.");
    
    var errors = 0, exploded = 0;
    
    _.forEach(_.keys(jsonData), function(url) {
        try {
            explodeFile(url, jsonData[url]);
            exploded++;
        } catch (ex) {
            if (options.cli.debug) {
                console.error("Failed exploding '" + url + "'.");
                console.error(ex);
            }
            errors++;
        }
    });
    
    console.log(exploded + " file(s) succesfully written, " + errors + " files(s) failed.");
};

function getFile(url) {
    var filePath = path.join(basePath, urlparse(url).pathname);
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath);
    } else {
        return undefined;
    }
}

function explodeFile(url, data) {
    var folder = urlparse(url).pathname.match(/.*\//)[0];

    var resolveFolder = path.join(basePath, folder);
    
    mkdirp.sync(resolveFolder);
    
    var filePath = path.join(basePath, urlparse(url).pathname);

    if (filePath == resolveFolder) {
        filePath = filePath + "index.html";
    }
    
    if (! fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, new Buffer(data.data, 'base64'));
    }
}
