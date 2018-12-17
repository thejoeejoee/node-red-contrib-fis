module.exports = RED => {
    class FisNode {
        constructor(config) {
            RED.nodes.createNode(this, config);
            /**
             * @type MQTTBrokerNode
             */
            this.broker = RED.nodes.getNode(config.broker);
            this.topic = ['fis', 'node', config.nodeId].join('/');
            this.broker.connect();
            // this.config('config', 'config', {id: this.id}); // TODO: fuu?

            this.on('close', (removed, done) => {
                if (removed) {
                    // TODO: call config and call remove from node
                } else {
                    // TODO: something on restart?
                }
                done();
            });
        }

        config(app, appId, config) {
            console.log('CONFIG', app, appId, config);
            this.appPublish(
                'config',
                {
                    app,
                    config,
                    app_id: appId,
                    retain: true,
                },
                appId,
            )
        };

        appPublish(appId, payload, subtopic = null) {
            const qos = payload.qos;
            const retain = payload.retain;
            delete payload.qos;
            delete payload.retain;

            return this._publish(
                ['app', appId, subtopic].filter(_ => _).join('/'),
                {
                    app_id: appId,
                    payload,
                    qos,
                    retain,
                }

            );
        };

        /**
         * Publish message to node topic (/node/{hw_node_id}/{nodeTopic}).
         *
         * @param payload {Object}
         * @param nodeTopic {String}
         * @private
         */
        _publish(nodeTopic, payload) {
            const topic = [this.topic, nodeTopic.replace(/\/+$/, '').replace(/^\/+/, '')].join('/');

            const qos = payload.qos;
            const retain = payload.retain;
            delete payload.qos;
            delete payload.retain;

            console.log('PUBLISH', topic, payload);
            const publish = () => this.broker.publish({topic, payload, qos, retain});

            if (this.broker.connected)
                publish();
            else
                this.broker.client.on('connect', publish)

        };
    }

    RED.nodes.registerType("fis-node", FisNode);
};