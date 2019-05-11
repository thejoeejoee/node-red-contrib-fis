/**
 * (C) Copyright 2019 Josef Kolar (xkolar71)
 * Licenced under MIT.
 * Part of bachelor thesis.
 */

module.exports = function (RED) {
    const APP = 'dac';

    class DAC {

        constructor(config) {
            RED.nodes.createNode(this, config);
            /**
             * @type FisNode
             */
            this.fisNode = RED.nodes.getNode(config.node);

            if (!this.fisNode) return;

            this.fisNode.installSubNode(this);

            // send configuration to app
            this.fisNode.config(APP, this.id, {
                port: config.dacPort,
            });

            // on incoming message sends value to app
            this.on('input', msg => {
                let payload = {
                    value: msg.payload.toString()
                };

                payload.retain = true;
                this.fisNode.appPublish(this.id, payload, 'value');
            });
        }
    }


    RED.nodes.registerType("fis-dac", DAC);
};