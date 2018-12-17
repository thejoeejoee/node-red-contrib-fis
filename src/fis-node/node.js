module.exports = RED => {
    const isUtf8 = require('is-utf8');

    class FisNode {
        constructor(config) {
            RED.nodes.createNode(this, config);
            /**
             * @type MQTTBrokerNode
             */
            this.broker = RED.nodes.getNode(config.broker);
            this.broker.connect();

            this._publish_topic = ['fis', 'to', config.nodeId].join('/');
            this._subscribe_topic = ['fis', 'from', config.nodeId].join('/');
            this.status_cb = null;
            // this.config('config', 'config', {id: this.id}); // TODO: fuu?

            this.on('close', (removed, done) => {
                if (removed) {
                    // TODO: call config and call remove from node
                } else {
                    // TODO: something on restart?
                }
                done();
            });
            this.broker.subscribe([this._subscribe_topic, 'status'].join('/'), 2, (topic, payload) => {
                if (!this.status_cb) return;
                if (isUtf8(payload)) payload = payload.toString();

                payload = JSON.parse(payload);
                if (payload.hasOwnProperty("online")) {
                    if (payload.online)
                        this.status_cb({fill: "green", shape: "dot", text: "online"});
                    else
                        this.status_cb({fill: "red", shape: "ring", text: "offline"});
                }
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
            const topic = [this._publish_topic, nodeTopic.replace(/\/+$/, '').replace(/^\/+/, '')].join('/');

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