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

            this.fisNode.config(APP, this.id, {
                port: config.dacPort,
            });

            this.on('input', msg => {
                let payload = {
                    value: msg.payload
                };

                payload.retain = true;
                this.fisNode.appPublish(this.id, payload, 'value');
            });
        }
    }


    RED.nodes.registerType("fis-dac", DAC);
};