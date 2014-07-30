/*jshint node: true */

module.exports = {
    getTransformStream: function (stream) {
        var filt;

        var f = function (r) {
            filt = r;
            return {
                as: function () {
                    return {
                        atPriority: function () {}
                    };
                }
            };
        };

        stream(f);

        return filt;
    }
};