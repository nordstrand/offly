/*jshint node: true */

var options = require("./lib/options");


exports.start = function (arg) {
    var args = options.parseArguments(arg);

    if (args.hasCommand("dump")) {
        require("./lib/dump").start(args);
    } else if (args.hasCommand("serve")) {
        require("./lib/serve").start(args);
    } else if (args.hasCommand("show")) {
        require("./lib/show")(args);
    } else if (args.hasCommand("explode")) {
        require("./lib/explode")(args);
    } else if (args.hasCommand("scrape")) {
        require("./lib/scrape").start(args);
    } else if (args.version) {
        console.log(require("./package.json").name + " version " + require("./package.json").version);
    } else {
        options.printHelp();
    }
};
