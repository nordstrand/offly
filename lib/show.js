
var fs = require("fs"),
    JSONStream = require("JSONStream"),
    _ = require("underscore"),
    options = require("./options.js"),
    sprintf = require("sprintf-js").sprintf,
    pretty = require('prettysize');



module.exports = function(file) {

    var jsonData = getFile(file);
  
    _.forEach(_.keys(jsonData), function(url) {
        var data = jsonData[url];
                
        var s = sprintf("%-40s => HTTP %d %20s %10s", 
                        abbreviate(url, 40), 
                        data.statusCode,
                        abbreviate(data.headers["Content-Type"], 20),
                        options.cli.debug ? data.size : pretty(data.size));
        console.log(s);
    });
};

function getFile(file) {
    try {
        var fileData = fs.readFileSync(file);
        return JSON.parse(fileData);
    } catch(ex) {
        console.log("Failed reading '" + file + "'.");
        console.log(ex);
    }
}

function abbreviate(s, size) {
    return (s && s.length > size && ! options.cli.debug) ? 
        s.replace(new RegExp("(.{" + (size - 3) +"}).*"), "$1...") : 
    s;
}
    
