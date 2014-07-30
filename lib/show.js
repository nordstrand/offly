/*jshint node: true */

var _ = require("underscore"),
    sprintf = require("sprintf-js").sprintf,
    pretty = require('prettysize'),
    loadDumpFile = require("./common").loadDumpFile;

module.exports = function(options) {
    loadDumpFile(options.file)
    .then(function(data) {
        show(data, options);
    });
};

function show(jsonData, options) {
    _.forEach(_.keys(jsonData), function(url) {
        var data = jsonData[url];
        var s = sprintf("%-40s => HTTP %d %20s %10s",
                        abbreviate(url, 40, options),
                        data.statusCode,
                        abbreviate(data.headers["Content-Type"], 20, options),
                        options.debug ? data.size : pretty(data.size));
        console.log(s);
    });
}

function abbreviate(s, size, options) {
    return (s && s.length > size && ! options.debug) ?
        s.replace(new RegExp("(.{" + (size - 3) +"}).*"), "$1...") :
    s;
}
