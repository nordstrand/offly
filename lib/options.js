
var options;

var defaults =  {explode_path : "exploded/",
                 file : "http.json",
                 port : 8128};

module.exports = {

    parseArguments : function(argv) {
        options = require('minimist')(argv.slice(2), { default : defaults});
        this.cli = require('minimist')(argv.slice(2), { default : defaults});
    },


    cli : options,

    contains : function(key) {
        return options._.indexOf(key) != -1;
    },

    printHelp : function () {
        console.log(require("../package.json").name + " [<global options>] command [<options>]" );
        console.log();
        console.log();
        console.log("Commands");
        console.log("dump    - spin up proxy dumping intercepted traffic to file");
        console.log();
        console.log("explode - explodes dump file to file system");
        console.log("  --explode_path=<path to populate with content> " +defaultString("explode_path"));
        console.log();
        console.log("serve   - serve dump file contents over http");
        console.log("  --explode runs in exploded mode, resources in path will take precendence over dump file contents");
        console.log("  --explode_path=<path to scan for content> " +defaultString("explode_path"));
        console.log();
        console.log( "show    - show dump file contents");
        console.log();
        console.log();
        console.log("Global options");
        console.log( "  --file=<path to dump file> " + defaultString("file"));
        console.log( "  --port=<tcp listener port> " + defaultString("port"));
        console.log( "  --sslDomain=<ssl domain to intercept> ");
        console.log( "  --sslCrtFile=<certificate file for domain to intercept> ");
        console.log( "  --sslKeyFile=<key file for domain to intercept> ");
        console.log( "  --debug");
        console.log( "  --version");
    }
}

function defaultString(key) {
    return "(default '" + defaults[key] + "')";
}
