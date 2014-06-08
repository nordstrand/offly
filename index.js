
/*
myProxy.on("interceptResponseContent", function (buffer, responseObject, isSsl, charset, callback) {
  var content = buffer.toString('utf8');
  var css = "<"+"link rel='stylesheet' href='http://axiak.github.com/filternet/blink.css'>";
  callback(content.replace(/<\/head>/i, css + "</head>"));
});
*/


/*
myProxy.on("interceptRequest", function (requestOptions, callback) {
    console.log("REQ" + requestOptions.path);
    callback(requestOptions);
});
*/


var request = require("request");

(function() {
} (process.argv))


var argv = require('minimist')(process.argv.slice(2), { default : {file : "http.json"}});

if (argv._.indexOf("dump") != -1 ) {
    require("./lib/dump").start(argv.file);
} else {
    help();
}



function help() {
    console.log(require("./package.json").name + " version " + require("./package.json").version);
    console.log( "dump - spin up intercepting proxy for dumping traffic to file"); 
    console.log( "--file=<path to spool file>");
    
}