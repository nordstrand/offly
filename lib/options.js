
var options;

var defaults =  {explode_path : "exploded/",
                 file : "http.json",
                 port : 8128};

exports.parseArguments = function(argv) {
 
    options = require('minimist')(process.argv.slice(2), { default : defaults})
}

exports.get = function(key) {
    return options[key];
}

exports.contains = function(key) {
    return options._.indexOf(key) != -1;
}

exports.printHelp = function () {
    console.log(require("../package.json").name + " [<global options>] command [<options>]" );
    console.log();
    console.log();
    console.log("Commands");
    console.log( "dump  - spin up proxy dumping intercepted traffic to file");
    console.log();
    console.log( "serve - serve dump file contents over http");
    console.log( "  --explode runs in exploded mode, resources in path will take precendence to file contents");
    console.log( "  --explode_path=<path to scan for content> " +defaultString("explode_path"));
    console.log();
    console.log( "show  - show dump file contents");
    console.log();
    console.log();
    console.log("Global options");
    console.log( "  --file=<path to dump file> " + defaultString("file"));
    console.log( "  --port=<tcp listener port> " + defaultString("port"));
    console.log( "  --debug");
    console.log( "  --version");

}

function defaultString(key) {
    return "(default '" + defaults[key] + "')";
}
