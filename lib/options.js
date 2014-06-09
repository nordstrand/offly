
var options;

exports.parseArguments = function(argv) {
 
    options = require('minimist')(process.argv.slice(2), { default : {
                                                            explode_path : "exploded/",
                                                            file : "http.json",
                                                            port : 8123}})
}

exports.get = function(key) {
    return options[key];
}

exports.contains = function(key) {
    return options._.indexOf(key) != -1;
}