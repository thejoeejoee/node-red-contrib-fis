module.exports = RED => {
    class FisNode {
        constructor(config) {
            RED.nodes.createNode(this, config);
            /**
             * @type MQTTBrokerNode
             */
            this.broker = RED.nodes.getNode(config.broker);
            this.topic = ['', 'node', config.nodeId].join('/');
            this.broker.connect();
            this.config('config', 'config', {id: this.id}); // TODO: fuu?

            this.on('close', (removed, done) => {
                if (removed) {
                    // TODO: call config and call remove from node
                } else {
                    // TODO: something on restart?
                }
                done();
            });
        }

        publish(appId, payload) {
            return this._publish({
                app_id: appId,
                payload,
            });

        };

        config(app, app_id, config) {
            console.log('CONFIG', app, app_id, config);
            this.publish(
                'config',
                {
                    app,
                    config,
                    app_id,
                }
            )
        };

        _publish(payload) {
            console.log('PUBLISH', this.topic, payload);
            const publish = () => this.broker.publish({
                topic: this.topic,
                payload,
            });

            if (this.broker.connected)
                publish();
            else
                this.broker.client.on('connect', publish)

        };
    }

    RED.nodes.registerType("fis-node", FisNode);
};