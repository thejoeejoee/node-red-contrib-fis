/**
 * (C) Copyright 2019 Josef Kolar (xkolar71)
 * Licenced under MIT.
 * Part of bachelor thesis.
 */

module.exports = function (RED) {
    const APP = 'dht-sensor';

    class DhtSensor {
        constructor(config) {
            RED.nodes.createNode(this, config);
            /**
             * @type FisNode
             */
            this.fisNode = RED.nodes.getNode(config.node);

            if (!this.fisNode) return;

            this.fisNode.installSubNode(this);

            this.fisNode.config(APP, this.id, {
                port: config.sensorPort,
                type: config.sensorType,
                interval: config.interval,
            });

            this.fisNode.appSubscribe(this, (topic, payload) => {
                this.send(payload);
            }, 'data');
        }
    }

    RED.nodes.registerType("fis-dht-sensor", DhtSensor);
};