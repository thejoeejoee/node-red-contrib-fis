module.exports = function (RED) {
    class NeoPixelDisplay {
        constructor(config) {
            RED.nodes.createNode(this, config);
            this.fisNode = RED.nodes.getNode(config.node);

            this.on('input', msg => {
                this.fisNode.publish({
                    app: 'neopixel-display',
                    payload: {text: msg.payload}
                })

            });
        }
    }

    RED.nodes.registerType("fis-neopixel-display", NeoPixelDisplay);
};