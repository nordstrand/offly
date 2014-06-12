var options = require("./lib/options");


options.parseArguments(process.argv) ;

if (options.contains("dump")) {
    require("./lib/dump").start(options.get("file"));
} else if (options.contains("serve")) {
    require("./lib/serve").start(options.get("file"));
} else if (options.contains("show")) {
    require("./lib/show")(options.get("file"));
} else if (options.contains("explode")) {
    require("./lib/explode")(options.get("file"));    
} else if (options.get("version")) { 
    console.log(require("./package.json").name + " version " + require("./package.json").version);
} else {
    options.printHelp();
}


