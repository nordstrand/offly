var es = require('event-stream');

module.exports = function (register) {

    var stream = es.mapSync(function (d) {
        var response = d.response;

        if (response.data) {
            response.data = new Buffer(response.data, 'base64');
        }

        return d;
    });

    register(stream).as("decode data").atPriority(11);
};
