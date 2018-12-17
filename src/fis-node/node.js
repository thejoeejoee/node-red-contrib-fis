module.exports = RED => {
    class FisNode {
        constructor(config) {
            RED.nodes.createNode(this, config);
            this.broker = RED.nodes.getNode(config.broker);
            this.topic = ['', 'node', config.nodeId].join('/');
        }

        publish(payload) {
            this.broker.publish({
                topic: this.topic,
                payload: payload,
            })
        };
    }

    RED.nodes.registerType("fis-node", FisNode);
};