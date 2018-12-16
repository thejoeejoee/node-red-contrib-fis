module.exports = function (RED) {
    function FisNode(config) {
        RED.nodes.createNode(this, config);
        this.broker = RED.nodes.getNode(config.broker);
        this.topic = ['', 'node', config.nodeId].join('/');
    }

    FisNode.prototype.publish = function (payload) {
        this.broker.publish({
            topic: this.topic,
            payload: payload,
        })
    };

    RED.nodes.registerType("fis-node", FisNode);
};