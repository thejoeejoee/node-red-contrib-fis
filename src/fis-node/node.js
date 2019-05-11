/**
 * (C) Copyright 2019 Josef Kolar (xkolar71)
 * Licenced under MIT.
 * Part of bachelor thesis.
 */

module.exports = RED => {
    const isUtf8 = require('is-utf8');
    const constants = require('./../constants');

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
            this.sub_nodes = [];

            this.broker.subscribe([this._subscribe_topic, 'status'].join('/'), 2, (topic, payload) => {
                if (isUtf8(payload)) payload = payload.toString();

                payload = JSON.parse(payload);
                if (payload.hasOwnProperty("online")) {
                    this.sub_nodes.map((subnode) => {
                        subnode._node_status = !!payload.online;
                        subnode.handleStatusChange();
                    });
                }
            });
        }

        /**
         * Called with subnode (eg sensor node instance, display node instance) registers subnode into fis-node
         * registry and adds some features:
         *
         * *** node/app status watching - result is presented with node-red status() function
         * *** node removing sends message to config app about node removing - app is also removed on node
         *
         * @param node
         */
        installSubNode(node) {
            // insert into known nodes using this FisNode
            this.sub_nodes.push(node);
            // assuming all is OK
            node._node_status = true;
            node._app_status = true;
            const app_log_topic = [this._subscribe_topic, 'app', node.id, 'log'].join('/');

            node.handleStatusChange = function () {
                let status = {};
                if (!node._node_status) {
                    status = {fill: "red", shape: "dot", text: "node offline"};
                } else if (node._node_status && !node._app_status) {
                    status = {fill: "yellow", shape: "ring", text: "node online, app offline"};
                } else {
                    status = {fill: "green", shape: "dot", text: "node online, app online"};
                }
                node.status(status);
            };

            // subscribe for app log channel
            this.broker.subscribe(app_log_topic, 1, (topic, payload) => {
                if (isUtf8(payload)) payload = payload.toString();
                payload = JSON.parse(payload);

                if (payload.level === 'error') node._app_status = false;
                node.handleStatusChange();
            }, node.id);

            node.on('close', (removed, done) => {
                if (removed) {
                    this.config(null, node.id, {}, constants.CONFIG.ACTION_REMOVE);
                    let index = this.sub_nodes.indexOf(node);
                    if (index > -1) {
                        this.sub_nodes.splice(index, 1);
                    }
                    this.broker.unsubscribe(app_log_topic, node.id);
                } else {
                    // something on restart?
                }
                done();
            });
            node.handleStatusChange();
        }

        /**
         * Sends purely new or updated config message via service channel to node.
         *
         * @param app app identifier
         * @param appId new app id
         * @param config configuration
         * @param action config action, default is
         */
        config(app, appId, config, action = constants.CONFIG.ACTION_INIT) {
            this.debug('CONFIG ' + app + ' ' + appId + ' ' + JSON.stringify(config));
            this.appPublish(
                'config',
                {
                    app,
                    config,
                    action,
                    app_id: appId,
                    retain: true,
                },
                appId,
            );
            if (action === constants.CONFIG.ACTION_REMOVE) {
                this._resetRetain(['app', 'config', appId].join('/'));
            }
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
         * @param node specific node
         * @param callback message callback(str topic, Object payload)
         * @param subtopic optional subtopic
         * @param qos needed qos
         * @param ref reference for unsubscribe
         * @returns {void|*|Promise<PushSubscription>}
         */
        appSubscribe(node, callback, subtopic = null, qos = 1, ref = 0) {
            const topic = [this._subscribe_topic, 'app', node.id, subtopic].filter(_ => _).join('/');
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
                    // incomming message == app is only, hooray!
                    node._app_status = true;
                    node.handleStatusChange();
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


        /**
         * Resets retined message with empy message-
         * @param nodeTopic topic to reset retain
         * @private
         */
        _resetRetain(nodeTopic) {
            const topic = [
                this._publish_topic,
                nodeTopic.replace(/\/+$/, '').replace(/^\/+/, '') // strip all redundant slashes from begin or end
            ].join('/');
            this.debug('RETAIN RESET ' + topic);

            const publish = () => this.broker.publish({topic, payload: "", qos: 1, retain: true});

            if (this.broker.connected)
                publish();
            else
                this.broker.client.on('connect', publish)
        }
    }

    RED.nodes.registerType("fis-node", FisNode);
};