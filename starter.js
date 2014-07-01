var options = require("./lib/options");


exports.start = function (arg) {
    options.parseArguments(arg);

    if (options.contains("dump")) {
        require("./lib/dump").start(options.cli.file);
    } else if (options.contains("serve")) {
        require("./lib/serve").start(options.cli.file);
    } else if (options.contains("show")) {
        require("./lib/show")(options.cli.file);
    } else if (options.contains("explode")) {
        require("./lib/explode")(options.cli.file);
    } else if (options.contains("scrape")) {
        require("./lib/scrape").start(options.cli.file);
    } else if (options.cli.version) {
        console.log(require("./package.json").name + " version " + require("./package.json").version);
    } else {
        options.printHelp();
    }
}
