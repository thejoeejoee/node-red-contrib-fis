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
            this.debug('CONFIG ' + app + ' ' + appId + ' ' + JSON.stringify(config));
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
                    app_id: appId, // TODO: remove app_id from payload, is already in topic
                    payload,
                    qos,
                    retain,
                }
            );
        };

        appSubscribe(appId, callback, subtopic = null, qos = 2, ref = 0) {
            const topic = [this._subscribe_topic, 'app', appId, subtopic].filter(_ => _).join('/');
            this.debug('SUBSCRIBE ' + topic);

            return this.broker.subscribe(
                topic,
                qos,
                (topic, payload) => {
                    if (isUtf8(payload)) payload = payload.toString();

                    try {
                        callback(topic, JSON.parse(payload));
                    } catch (e) {
                        this.warn('Cannot parse ' + typeof payload);
                    }
                },
                ref,
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

            this.debug('PUBLISH ' + topic + ' ' + JSON.stringify(payload));
            const publish = () => this.broker.publish({topic, payload, qos, retain});

            if (this.broker.connected)
                publish();
            else
                this.broker.client.on('connect', publish)

        };
    }

    RED.nodes.registerType("fis-node", FisNode);
};