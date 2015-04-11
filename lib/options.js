/*jshint node: true */

var options;

var defaults =  {
    explode_path : "exploded/",
    port : 8128,
    quiet : false
};

var defaultFile = "http.json";

var aliases = {
    append : "a",
    debug : "d",
    quiet : "q",
    version : "v"
};

module.exports = {

    parseArguments : function(argv) {
        options = require('minimist')(argv.slice(2), { 
            default : defaults, 
            alias : aliases, 
            boolean : ["append", "httplog", "recursive", "quiet", "relativize"]});
        this.cli = options;
        
        options.hasCommand = function(key) {
            return options._.indexOf(key) != -1;
        };
        
        options.file = options._.length > 1 ? options._[1] : defaultFile;
        
        return options;
    },

    cli : options,

    printHelp : function () {
        console.log(require("../package.json").name + " command [<options>] <FILE>" );
        console.log();
        console.log("(De)serialize web site to FILE, default file name is '" + defaultFile + "'.");
        console.log();
        console.log("Serialization Commands");
        console.log("  scrape  - autonomously scrape urls");
        console.log("    -a, --append rather than truncate pre existing file");
        console.log("    --crawl_url=<url to crawl>");
        console.log("    --exclude=<reg exp> matching url:s when crawling recursively");
        console.log("    --include=<reg exp> matching url:s when crawling recursively");
        console.log("    --recursively follow links");
        console.log("    --relativize links in html anchors");
        console.log("    --transform_dir=<path> to custom transforms to run on http transactions");
        console.log();
        console.log("  dump    - spin up a http proxy that dumps intercepted traffic to file");
        console.log("    -a, --append rather than truncate pre existing file");
        console.log("    --port=<tcp listener port> " + defaultString("port"));
        console.log("    --relativize links in html anchors");
        console.log("    --sslDomain=<ssl domain to intercept>, '*' will intercept all domains (using a generated self-signed certificate)");
        console.log("    --sslCrtFile=<certificate file for domain to intercept> ");
        console.log("    --sslKeyFile=<key file for domain to intercept> ");
        console.log("    --transform_dir=<path> to custom transforms to run on http transactions");
        console.log();
        console.log("Deserialization Commands");
        console.log("  explode - explodes file to file system");
        console.log("    --explode_path=<path to populate with content> " +defaultString("explode_path"));
        console.log();
        console.log("  serve   - serve file contents over http");
        console.log("    --explode runs in exploded mode, resources in path will take precendence over file contents");
        console.log("    --explode_path=<path to scan for content> " +defaultString("explode_path"));
        console.log("    --online_transform_dir=<path> to custom transforms to run on http transactions during serve");
        console.log("    --port=<tcp listener port> " + defaultString("port"));
        console.log();
        console.log( "  show    - show file contents");
        console.log();
        console.log();
        console.log("Common options");
        console.log("  --httplog");
        console.log("  -d, --debug");
        console.log("  -q, --quiet");
        console.log("  -v, --version");
    }
};

function defaultString(key) {
    return "(default '" + defaults[key] + "')";
}
