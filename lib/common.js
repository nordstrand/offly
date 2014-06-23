

module.exports = {
    started : function() {
        if (process.send) {
            process.send({status : "started"});
        }
    }
};