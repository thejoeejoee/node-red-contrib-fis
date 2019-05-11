/**
 * (C) Copyright 2019 Josef Kolar (xkolar71)
 * Licenced under MIT.
 * Part of bachelor thesis.
 */

module.exports = function (RED) {
    const APP = 'neopixel-display';

    class NeoPixelDisplay {

        constructor(config) {
            RED.nodes.createNode(this, config);
            /**
             * @type FisNode
             */
            this.fisNode = RED.nodes.getNode(config.node);

            if (!this.fisNode) return;

            this.fisNode.installSubNode(this);

            this.fisNode.config(APP, this.id, {
                port: config.displayPort,
                width: config.width,
                height: config.height,
            });

            this.on('input', msg => {
                let payload = {
                    text: msg.payload
                };

                if (msg.color)
                    payload.color = msg.color;

                payload.retain = true;
                this.fisNode.appPublish(this.id, payload, 'text');
            });
        }
    }


    RED.nodes.registerType("fis-neopixel-display", NeoPixelDisplay);
};