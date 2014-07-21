var normalizeheaders = require("../../lib/transforms/normalize-headers"),
    concat = require('concat-stream'),
    expect = require('chai').expect,
    getTransformStream = require("../test-utils").getTransformStream;

describe("normalize-header", function () {
    it("should normalize http header", function (done) {

        var normalizeStream = getTransformStream(normalizeheaders);

        normalizeStream
            .pipe(concat(function (data) {
                expect(data[0].headers["Content-Type"]).to.equal("text/plain");
                done();
            }));

        normalizeStream.end({
            headers: {
                'content-Type': 'text/plain'
            }
        });
    });
});