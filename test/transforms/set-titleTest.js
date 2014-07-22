var settitle = require("../../transform-example/set-title"),
    concat = require('concat-stream'),
    expect = require('chai').expect,
    getTransformStream = require("../test-utils").getTransformStream;;

describe("normalize-header", function () {
    
    it("should set title for html", function (done) {

        var stream = getTransformStream(settitle);

        stream
        .pipe(concat(function (data) {
            var html = data[0].data.toString();
            
            expect(html).to.contain("<title>OFFLY: DOH</title>");
            
            done();
        }));

        stream.end({
            headers: {
                "Content-Type": "text/html"
            },
            data: html("<html>" +
                         "  <head>" +
                         "    <title>DOH</title>" +
                         "  </head>" +
                         "  <body>" +
                         "  </body>" +
                         "</html>")
        });
    });
    
    
    it("should not touch non-html content html", function (done) {

        var stream = getTransformStream(settitle);

        stream
        .pipe(concat(function (data) {
            var html = data[0].data.toString();
            
            expect(html).not.to.contain("<title>OFFLY: DOH</title>");
            
            done();
        }));

        stream.end({
            headers: {
                "Content-Type": "image/png"
            },
            data: html("<html>" +
                         "  <head>" +
                         "    <title>DOH</title>" +
                         "  </head>" +
                         "  <body>" +
                         "  </body>" +
                         "</html>")
        });
    });
    

    
    
    function html(s) {
        return new Buffer(s);
    }
});