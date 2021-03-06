/*
 * gsocket
 * https://github.com/goliatone/gsocket
 * Created with gbase.
 * Copyright (c) 2014 goliatone
 * Licensed under the MIT license.
 *
 * http://dev.w3.org/html5/websockets/#ping-and-pong-frames
 */
/* jshint strict: false, plusplus: true */
/*global define: false, require: false, module: false, exports: false */
define('gsocket', ['extend'], function(_extend) {

    /**
     * Shim console, make sure that if no console
     * available calls do not generate errors.
     * @return {Object} Console shim.
     */
    var _shimConsole = function(con) {

        if (con) return con;

        con = {};
        var empty = {},
            noop = function() {},
            properties = 'memory'.split(','),
            methods = ('assert,clear,count,debug,dir,dirxml,error,exception,group,' +
                'groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,' +
                'table,time,timeEnd,timeStamp,trace,warn').split(','),
            prop,
            method;

        while (method = methods.pop()) con[method] = noop;
        while (prop = properties.pop()) con[prop] = empty;

        return con;
    };

    var _splice = Array.prototype.splice;
    var _unshift = Array.prototype.unshift;

    var _isFunction = function(src, method) {
        return src && method && src[method] && typeof src[method] === 'function';
    };

    ///////////////////////////////////////////////////
    // DEFAULTS
    // TODO: Rename `tries` to `connectionAttempts`
    ///////////////////////////////////////////////////

    var options = {
        /**
         * Should the instance try to connect on
         * `init` or wait for an explicit call to
         * `connect`
         * @type {Boolean}
         */
        autoconnect: true,
        /**
         * Process service event to handle data
         *
         * TODO: This discards the original server
         * event and only returns the data object.
         * Is this really the implementation that we
         * want as default?!
         *
         * @param  {MessageEvent} event WebSocket event.
         * @return {Object}
         */
        processPlatformEvent: function(event) {
            var data = event.data;

            if (data && typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                    return data;
                } catch (e) {
                    this.logger.warn('Error parsing event data', e, data);

                }
            }
            return event;
        },
        isValidEndpoint: function() {
            return !!this.endpoint.match(/^ws(s?):\/\//);
        },
        /**
         * Object that will be sent as a
         * JSON string to server once per
         * client connection on `onconnection`
         * @type {Object}
         */
        handshake: {
            ping: 'ping'
        },
        /**
         * Heartbeat message to be sent to
         * server. By default we send a timestamp.
         * @type {Object}
         */
        heartbeat: {

        },
        /**
         * Default configuration object.
         * At least we should provide the
         * transport service, `WebSocket` by
         * default. Useful for unit testing.
         * @type {Object}
         */
        config: {
            provider: function(url) {
                //Need to wrap WebSocket in a closure because
                //WebKit/Safari treats WebSocket as an Object,
                //not as a Function like Chrome/FF.
                return new WebSocket(url);
            }
        },
        /**
         * Level of chatter from client to server.
         * A value of 0 will disable all chatter.
         * A level of 1 will send a handshake.
         * A level of 2 will send a heartbeat every
         * `keepalive` interval.
         * @type {int}
         */
        verbosity: 0,
        /**
         * Enable error logging using provided
         * logger.
         * @type {Boolean}
         */
        logErrors: true,
        /**
         * List of `onclose` event codes that
         * should trigger a connection retry if
         * enabled.
         * @type {Array}
         */
        reconnectOnClose: [1006],
        /**
         * Should the client to connect again
         * after a timeout?
         * @type {Boolean}
         */
        reconnectAfterTimeout: true,
        /**
         * If a connection fails, `maxtries`
         * is the number of times the client will
         * try to lift that connection.
         * @type {Number}
         */
        maxtries: 5,
        /**
         * Time in milliseconds between each
         * reconnection try that the client
         * performs.
         * Default value 60000- 1 * 60 * 1000
         * @type {Number}
         */
        retrytime: 1 * 60 * 10000,
        /**
         * Max time between retries, in milliseconds.
         * By default is twice the retry time.
         * Default value 120000- 2 * (1 * 60 * 1000)
         * @type {Number}
         */
        maxRetryTime: 2 * /*retrytime*/ (1 * 60 * 1000),
        /**
         * Time in milliseconds that has to
         * pass for a connection to be considered
         * timed out.
         * Default is 90000- 1.5 * 60 * 1000
         * @type {Number}
         */
        timeout: 0.5 * 60 * 1000, //We should set it to something more like 20000
        /**
         * Time in milliseconds between heartbeats
         * if enabled.
         * Default is 30000- 30 seconds.
         * @type {Number}
         */
        keepalive: 0.5 * 60 * 1000 //ping every 2.5 minutes?
    };

    ///////////////////////////////////////////////////
    // CLASS PROPERTIES
    ///////////////////////////////////////////////////

    /*
     * VERSION
     */
    GSocket.VERSION = '0.0.3';

    /**
     * Class name
     *
     * @type {String}
     */
    GSocket.name = GSocket.prototype.name = 'GSocket';

    /**
     * Make default options available so we
     * can override.
     *
     * @type {Object}
     */
    GSocket.DEFAULTS = _extend({}, options);

    /**
     * The connection is not yet open.
     */
    GSocket.CONNECTING = 0;

    /**
     * The connection is open and
     * ready to communicate.
     */
    GSocket.OPEN = 1;

    /**
     * The connection is in the process
     * of closing.
     */
    GSocket.CLOSING = 2;

    /**
     * The connection is closed or
     * couldn't be opened.
     */
    GSocket.CLOSED = 3;

    /**
     * The connection has error'ed
     * out.
     */
    GSocket.ERRORED = -1;

    /**
     * The connection has timed out
     * Timeout value is configurable.
     */
    GSocket.TIMEDOUT = -2;

    /**
     * State code to string
     */
    GSocket.STATES = {
        0: 'CONNECTING',
        1: 'OPEN',
        // 2: 'CLOSING', This is only really imp by transport!
        3: 'CLOSED',
        4: 'RECONNECTING',
        '-1': 'ERRORED',
        '-2': 'TIMEDOUT'
    };

    /**
     * ON_CONNECTED event type
     * @type {String}
     */
    GSocket.ON_CONNECTED = 'connected';

    /**
     * Extend method.
     * @param  {Object} target Source object
     * @return {Object}        Resulting object from
     *                         meging target to params.
     */
    GSocket.extend = _extend;

    ///////////////////////////////////////////////////
    // CONSTRUCTOR
    // TODO: Move connection management to Supervisor
    ///////////////////////////////////////////////////

    /**
     * GSocket constructor
     *
     * @param  {object} config Configuration object.
     */
    function GSocket(config) {
        this.ID = Date.now();

        config = config || {};

        this.init(config);
    };

    ///////////////////////////////////////////////////
    // PUBLIC METHODS
    ///////////////////////////////////////////////////

    /**
     * Initialize and configure instance.
     *
     * You can provide a configuration object with
     * properties and methods to override the instance.
     * This object will be merged with the `DEFAULTS`
     * object.
     *
     * You should only call this method once. After the
     * first call an `initialized` variable will be set
     * to `true`. We check for this variable, if truthy
     * then we skip the method.
     *
     * @param  {Object} config Configuration object.
     * @return {this}
     */
    GSocket.prototype.init = function(config) {
        if (this.initialized) return this.logger.warn('Already initialized');
        this.initialized = true;

        // this.logger.log('GSocket: ' + this.ID + ' Init!');

        config = _extend({}, this.constructor.DEFAULTS, config);

        _extend(this, config);

        this.reset();

        if (this.autoconnect) this.connect();

        return this;
    };

    /**
     * Reset state. It will clear timer/interval
     * ids, reset number of tries to 0, erase the
     * message queue and the error list.
     *
     * @param  {Number} state State code.
     * @return {this}
     */
    GSocket.prototype.reset = function(state) {
        /*
         Queue, all messages should be managed and on connection failure we
         should be able to recover.
         */
        this.messages = [];

        /*
         Restore connection errors.
         */
        this.errors = [];

        /*
         reset connection handling
         */
        this.tries = 0;

        /*
         reset state to default state or passed in
         state.
         */
        this.state = state ? state : GSocket.CLOSED;

        this.clearIds();

        return this;
    };

    /**
     * Establish connection with service
     * @return {this}
     */
    GSocket.prototype.connect = function(endpoint) {
        //TODO: Should we be able to abort current connection?
        if (this.state === GSocket.CONNECTING) return false;

        endpoint && (this.endpoint = endpoint);

        try {

            this.validateEndpoint();

            var Service = this.config.provider;
            this.service = new Service(this.endpoint);

            this.tries += 1; //<== Move this to connect
            this.clearIds();

            this.logger.log('Connect', this.tries, new Date().toString().split(" ")[4]);

            this.state = GSocket.CONNECTING;
            this.timeoutId = this.setTimeout(this.handleTimeout.bind(this), this.timeout);

            this.service.onerror = this.onError.bind(this);
            this.service.onopen = this.onConnected.bind(this);
            this.service.onclose = this.onClosed.bind(this);
            this.service.onmessage = this.onMessage.bind(this);

        } catch (e) {
            /*
             * We can get a different errors:
             * code 12: Wrong protocol, wrong URL
             */
            this.onError(e);
        }

        return this;
    };

    GSocket.prototype.disconnect = function() {
        _isFunction(this.service, 'close') && this.service.close();
        this.reset();
    };

    GSocket.prototype.validateEndpoint = function() {
        if (!this.endpoint) throw new Error('GSocket needs endpoint!');
        if (!this.isValidEndpoint()) throw new Error('GSocket needs valid endpoint!')
    };

    /**
     * Clear timeout ID's
     * @private
     */
    GSocket.timeoutIds = ['retryId', 'timeoutId', 'heartbeatId'];
    GSocket.prototype.clearIds = function() {
        GSocket.timeoutIds.forEach(function(id) {
            this.clearTimeInterval(id);
        }, this);
    };

    /**
     * Get the retry time for the current request.
     * Implements a exponential back-off algorithm.
     *
     * @return {Number} Time in milliseconds for next retry.
     */
    GSocket.prototype.getRetryTime = function() {
        //Linear backoff
        // var delay = this.retrytime +  (this.tries * this.retrytime);
        //exponential backoff
        var delay = (Math.pow(2, this.tries) - 1) * 1000;
        return Math.min(delay, this.maxRetryTime);
    };

    /**
     * Timeout watcher. When we request a connection,
     * we monitor the time it takes to happen.
     *
     * @return void
     * @private
     */
    GSocket.prototype.handleTimeout = function() {

        _isFunction(this.service, 'close') && this.service.close();

        this.service = null;

        this.state = GSocket.TIMEDOUT;

        this.logger.warn('Connection timed out');

        if (!this.hasOwnProperty('reconnectAfterTimeout')) return false;
        if (this.reconnectAfterTimeout === false) return false;

        //TODO: What happens if we get a timeout between reconnection attempts?
        this.retryConnection();

        return true;
    };

    /**
     * Message size can cause connection to die if it exceeds some
     * resource limit on client or server. It might look like a
     * transient network error, if we restore connection and we
     * retry to send message from queue...BAM! Infinite loop.
     *
     * @param  {String|Object} message Message to be sent along. If object
     *                                 it will be converted to JSON string.
     * @return {this}
     */
    GSocket.prototype.send = function(message, store) {
        if (this.service.readyState !== GSocket.OPEN) {
            if (store !== false) this.messages.push(message);
            this.logger.warn("INVALID_STATE_ERR: Web Socket connection has not been established");
            return this;
        }

        this.logger.log('send ', message);

        if (typeof message === 'object') message.timestamp = Date.now();

        if (typeof message !== 'string') message = JSON.stringify(message);

        this.service.send(message);

        return this;
    };

    /**
     * Event handler, at this point we are
     * connected to our WebSocket server.
     */
    GSocket.prototype.onConnected = function() {
        this.logger.log('onConnected');

        //should we check for pong response? return this.send(JSON.stringify(this.handshake));
        if (this.state !== GSocket.OPEN) this.sendHandshake();

        var messages = this.messages.concat();

        this.reset(GSocket.OPEN);

        this.sendHeartbeat();

        this.emit('connected');

        if (messages.length === 0) return;

        /*
         * We do have queued up messages, just sent them.
         * TODO: Should we throttle send messages?
         */
        messages.forEach(function(message) {
            this.send(message);
        }, this);
    };

    /**
     * Event handler, we got disconnected from
     * the server.
     * CloseEvent
     * @param  {Object} event Server event.
     */
    GSocket.prototype.onClosed = function(event) {
        event || (event = {});

        this.logger.log('on disconnect', event.code, event.reason);

        this.state = GSocket.CLOSED;

        this.emit('closing', event);

        /*
         * Are we handling specific close events? If the event code
         * for this close event is found in `reconnectOnClose` then
         * it's considered an error and handled by the `onError`
         * method which might consider to retry the connection.
         */
        if (!this.hasOwnProperty('reconnectOnClose')) return false;
        if (!event || this.reconnectOnClose.indexOf(event.code) === -1) return false;

        //TODO: Should we pass also an specific handler for each error
        //code? and have onError as default?
        //reconnectOnClose[1006] = onError
        //reconnectOnClose[1009] = logger.log
        // this.onError(event);
        this.retryConnection();

        //TODO: IMPLEMENT A RECONNECT POLICY
        //code:1006, IE if server goes down
        //code 1000 CLOSE_NORMAL
        //code 1001 CLOSE_GOING_AWAY
        //code 1002 CLOSE_PROTOCOL_ERROR
        //code 1003 CLOSE_UNSUPPORTED
        //code 1005 CLOSE_NO_STATUS
        //code 1006 CLOSE_ABNORMAL: No close frame being sent
        //code 1007 Inconsistent data, eg, non UTF-8 in text msg
        //code 1008 Generic status like 1003/1009
        //code 1009 CLOSE_TOO_LARGE Data is too large
        //code 1010 Server did not negotiate
        //code 1011 Unexpected condition that prevented it from fulfilling.
    };

    /**
     * Event listener handling socket events.
     *
     * This will `emit` an event with type
     * `message`. Also, if `onMessageCallback` is
     * a function, it will be called with `event`
     * as the payload.
     *
     * @param  {Object} event Server event
     *
     * @event  'message'
     *
     */
    GSocket.prototype.onMessage = function(event) {
        this.logger.log('on message ', event);

        event = this.processPlatformEvent(event);

        // this.platformMessages.push(event);

        /*
         * If we have a static callback, trigger it.
         */
        if (_isFunction(this, 'onMessageCallback')) this.onMessageCallback(event);

        //Use stubbed emit method:
        this.emit('message', event);

        //TODO: Messages can return a failed state. IE, protocol did
        //not fail, but the business layer did.
        //Refuse connection, client with same ID already registered.
    };

    /**
     * Event listener handling socket events.
     *
     * @param  {Object} event Server event
     */
    GSocket.prototype.onError = function(event) {
        this.logErrors && this.logger.error(this.name, 'on error', event);

        this.errors.push(event);

        this.state = GSocket.CLOSED;
        // this.state = GSocket.ERRORED;

        this.emit('error', event);

        /*
         * We should figure out if the error warrants a retry.
         * For instance, we should not retry to connect to an
         * invalid URL.
         */
        // return this.retryConnection();
    };

    /**
     * Connection lost, we will try to recover from transient
     * closures, but use a timeout to ensure we don't waste time.
     */
    GSocket.prototype.retryConnection = function() {
        /*
         * We got an error:
         * - If we have exhausted allocated tries, then give up.
         * - If this is the first error, set a timer for the
         *   next scheduled try and let it fly.
         */
        if (this.tries >= this.maxtries) {
            this.clearTimeInterval('retryId');
            this.logger.warn('Not handling reconnection, we maxed number of tries');
            return false;
        }

        this.state = GSocket.RECONNECTING;
        // this.state = GSocket.CLOSING;

        //We should check out the readyState:
        this.clearTimeInterval('timeoutId');

        var retryIn = this.getRetryTime();

        this.logger.warn(this.name, 'retryConnection in', retryIn);

        this.retryId = this.setTimeout(this.connect.bind(this), retryIn);

        return this.retryId;
    };

    /**
     * Ensure connection stays alive, prevent idle
     * connection pruning.
     *
     * Proxies and firewalls can sometimes close
     * inactive connections.
     *
     * This does not avoid the need for handling `close`
     * events:
     * - WiFi/Mobile connection drop?
     * - Server crash?
     *
     * @return {this}
     */
    GSocket.prototype.sendHeartbeat = function() {
        if (this.verbosity < 2) return false;

        if (!this.heartbeatId) {
            return this.heartbeatId = this.setInterval(this.sendHeartbeat.bind(this), this.keepalive);
        }

        if (this.state !== GSocket.OPEN) return this.state;

        this.heartbeat.beat = Date.now();

        this.send(this.heartbeat, false);

        return this;
    };

    /**
     * Send initial handshake to service.
     * If `verbosity` is set to 0 it will
     * prevent handshakes to go through.
     *
     * @return {this}
     */
    GSocket.prototype.sendHandshake = function() {
        if (this.verbosity < 1) return false;

        this.send(this.handshake, false);
        return this;
    };

    /**
     * `processPlatformEvent` is a convenience method
     * to filter service messages before they get emitted
     * to application code.
     *
     * @param  {MessageEvent} event WebSocket event
     * @return {Object}
     */
    GSocket.prototype.processPlatformEvent = function(event) {
        return event;
    };

    /**
     * `setTimeout` implementation.
     * Mostly for mocking/unit testing.
     *
     * @param {Function} callback
     * @param {Number}   delay
     * @private
     */
    GSocket.prototype.setTimeout = function(callback, delay) {
        return setTimeout(callback, delay);
    };

    /**
     * `setInterval` implementation.
     * Mostly for mocking/unit testing.
     *
     * @param {Function} callback
     * @param {Number}   delay
     * @private
     */
    GSocket.prototype.setInterval = function(callback, delay) {
        return setInterval(callback, delay);
    };

    /**
     * Clears timeout and interval id.
     * Mostly for mocking/unit testing.
     *
     * @param  {String} id Name of property holding
     *                     either an interval id or an
     *                     timeout id.
     * @return {this}
     * @private
     */
    GSocket.prototype.clearTimeInterval = function(id) {
        if (!this.hasOwnProperty(id)) return false;

        clearTimeout(this[id]);
        clearInterval(this[id]);
        this[id] = undefined;

        return this;
    };

    /**
     * Logger method, meant to be implemented by
     * mixin. As a placeholder, we use console if available
     * or a shim if not present.
     *
     * @type {Object}
     */
    GSocket.prototype.logger = _shimConsole(console);

    /**
     * PubSub emit method stub.
     */
    // GSocket.prototype.emit = _shimConsole(console);
    GSocket.prototype.emit = function() {
        console.info('EMIT not imp', arguments);
    };

    return GSocket;
});