module.exports = RED => {
    const isUtf8 = require('is-utf8');

    class FisNode {
        constructor(config) {
            RED.nodes.createNode(this, config);

            /**
             * @type MQTTBrokerNode
             */
            this.broker = RED.nodes.getNode(config.broker);

            if (!this.broker) return;

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

        /**
         * Sends purely new or updated config message via service channel to node.
         *
         * @param app app identifier
         * @param appId new app id
         * @param config configuration
         */
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

        /**
         * Publish message for app specified by app_id (and optionally subtopic)
         * @param appId id of target app
         * @param payload message to send (could contain .retain or .qos)
         * @param subtopic subtopic
         */
        appPublish(appId, payload, subtopic = null) {
            const qos = payload.qos;
            const retain = payload.retain;
            delete payload.qos;
            delete payload.retain;

            return this._publish(
                ['app', appId, subtopic].filter(_ => _).join('/'), // subtopic is optional, filter() is to avoid '//'
                {
                    app_id: appId, // TODO: remove app_id from payload, is already in topic
                    payload,
                    qos,
                    retain,
                }
            );
        };

        /**
         * Subscribe callback to app topic (/from/{hw_node_id}/app/{app_id}[/{subtopic}]).
         * Useful for subscribing specific app on hw node.
         *
         * @param appId id of application
         * @param callback message callback(str topic, Object payload)
         * @param subtopic optional subtopic
         * @param qos needed qos
         * @param ref reference for unsubscribe
         * @returns {void|*|Promise<PushSubscription>}
         */
        appSubscribe(appId, callback, subtopic = null, qos = 1, ref = 0) {
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
                        this.warn('Cannot parse (' + typeof payload + ') ' + payload);
                    }
                },
                ref,
            );
        };

        /**
         * Publish message to node topic (/to/{hw_node_id}/{nodeTopic}).
         *
         * @param payload {Object}
         * @param nodeTopic {String}
         * @private
         */
        _publish(nodeTopic, payload) {
            const topic = [
                this._publish_topic,
                nodeTopic.replace(/\/+$/, '').replace(/^\/+/, '') // strip all redundant slashes from begin or end
            ].join('/');

            const qos = payload.qos === undefined ? 1 : payload.qos;
            const retain = payload.retain || false;
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