module.exports = function (RED) {
    const APP = 'dht-sensor';

    class DhtSensor {

        constructor(config) {
            RED.nodes.createNode(this, config);
            /**
             * @type FisNode
             */
            this.fisNode = RED.nodes.getNode(config.node);

            this.fisNode.status_cb = this.status.bind(this);

            this.fisNode.config(APP, this.id, {
                port: config.sensorPort,
                type: config.sensorType,
            });

            this.fisNode.appSubscribe(this.id, (topic, payload) => {
                this.send(payload);
            }, 'data')
        }
    }


    RED.nodes.registerType("fis-dht-sensor", DhtSensor);
};