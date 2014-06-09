var options = require("./lib/options");


options.parseArguments(process.argv) ;

if (options.contains("dump")) {
    require("./lib/dump").start(options.get("file"));
} else if (options.contains("serve")) {
    require("./lib/serve").start(options.get("file"));
} else if (options.contains("show")) {
    require("./lib/show")(options.get("file"));
} else if (options.get("version")) { 
    console.log(require("./package.json").name + " version " + require("./package.json").version);
} else {
    help();
}


function help() {
    console.log(require("./package.json").name + " command [<options>]" );
    console.log();
    console.log("Commands");
    console.log( "dump  - spin up proxy dumping intercepted traffic to file"); 
    console.log( "serve - serve dump file contents over http");
    console.log( "show  - show dump file contents");
    console.log();
    console.log("Options");
    console.log( "--file=<path to dump file>");
    console.log( "--port=<tcp port to listen to>");
    console.log( "--debug");
    console.log( "--version");
 
}