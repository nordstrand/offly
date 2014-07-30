/*jshint node: true, mocha : true */

var encodeData = require("../../lib/transforms/encode-data"),
    concat = require('concat-stream'),
    expect = require('chai').expect,
    getTransformStream = require("../test-utils").getTransformStream;

describe("encode-data", function () {
    
    var s = "<html>" +
        "  <head>" +
        "    <title>DOH</title>" +
        "  </head>" +
        "  <body>" +
        "  </body>" +
        "</html>";
    
    it("should base64 encode", function (done) {
        var stream = getTransformStream(encodeData);

        stream
        .pipe(concat(function (data) {
            
            var decodedData = new Buffer(data[0].data, "base64").toString();
            expect(decodedData).to.equal(s);
            done();
        }));

        stream.end({
            headers: {
                "Content-Type": "text/html"
            },
            data: html(s)
        });
    });

    function html(s) {
        return new Buffer(s);
    }
});