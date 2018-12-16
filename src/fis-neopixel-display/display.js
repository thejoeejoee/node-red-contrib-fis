module.exports = function (RED) {
    class NeoPixelDisplay {
        constructor(config) {
            RED.nodes.createNode(this, config);
            this.fisNode = RED.nodes.getNode(config.node);

            this.on('input', msg => {
                let payload = {
                    text: msg.payload
                };

                if (msg.color)
                    payload.color = msg.color;

                this.fisNode.publish({
                    app: 'neopixel-display',
                    payload,
                })

            });
        }
    }

    RED.nodes.registerType("fis-neopixel-display", NeoPixelDisplay);
};