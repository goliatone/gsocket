/*global define:true, describe:true , it:true , expect:true,
beforeEach:true, sinon:true, spyOn:true , expect:true */
/* jshint strict: false */
define(['gsocket'], function(GSocket) {
    window.GSocket = GSocket;

    var FakeTimers = sinon.useFakeTimers();
    window.FT = FakeTimers;
    var NOOP = function() {};

    var MockWebSocket = function(url, protocols) {
        this.created = true;
        this.url = url;
        this.protocols = protocols;
        MockWebSocket.METHODS = ['send', 'close'];
        MockWebSocket.HANDLERS = ['onopen', 'onclose', 'onmessage', 'onerror'];

        var spies = [].concat(MockWebSocket.METHODS, MockWebSocket.HANDLERS);

        spies.forEach(function(method) {
            this[method] = sinon.spy();
        }.bind(this));

        this.readyState = -2;
    };

    /*
     Disable logging errors to console,
     */
    GSocket.DEFAULTS.logErrors = false;
    GSocket.DEFAULTS.config = {
        provider: function(url) {
            return new MockWebSocket(url);
        }
    };
    GSocket.DEFAULTS.endpoint = 'ws://localhost:9000/API/websockets'

    GSocket.DEFAULTS.emit = NOOP;
    GSocket.DEFAULTS.reconnectAfterTimeout = false;


    /* //////////////////////////////////////////////////
    // TESTS
//////////////////////////////////////////////////*/

    describe('GSocket', function() {
        var gsocket;

        beforeEach(function() {
            gsocket = new GSocket({});
        });

        it('should be loaded', function() {
            expect(GSocket).toBeTruthy();
            expect(gsocket).toBeTruthy();
        });

        it('should have a DEFAULTS class property', function() {
            expect(GSocket.DEFAULTS).toBeTruthy();
        });

        it('should have a VERSION class property', function() {
            expect(GSocket.VERSION).toBeTruthy();
        });

        it('should initialize an instance with all DEFAULTS props', function() {
            var props = Object.keys(GSocket.DEFAULTS);
            expect(gsocket).toHaveProperties(props);
        });

        it('should have a name property on prototype and constructor', function() {
            expect(GSocket.name).toEqual('GSocket');
            expect(GSocket.prototype.name).toEqual('GSocket');
        });

        it('once initialized it should not execute the init method more than once', function() {
            var spy = sinon.spy(GSocket.prototype, 'init');
            gsocket = new GSocket({});
            gsocket.init();
            expect(gsocket.initialized).toBeTruthy();
            expect(spy).toHaveBeenCalledTwice();
            GSocket.prototype.init.restore();
        });

        it('on init it should reset', function() {
            var spy = sinon.spy(GSocket.prototype, 'reset');
            gsocket = new GSocket({});
            expect(spy).toHaveBeenCalledOnce();
            GSocket.prototype.reset.restore();
        });

        it('reset should set state to GSocket.CLOSED', function() {
            gsocket = new GSocket({});
            gsocket.state = 'SOMETHING';
            gsocket.reset();
            expect(gsocket.state).toEqual(GSocket.CLOSED);
        });

        it('reset should take a state argument GSocket.CLOSED', function() {
            gsocket = new GSocket({});
            gsocket.state = 'SOMETHING';
            gsocket.reset(GSocket.ERRORED);
            expect(gsocket.state).toEqual(GSocket.ERRORED);
        });

        it('reset should set number of tries to 0', function() {
            gsocket = new GSocket({});
            gsocket.tries = 333;
            gsocket.reset();
            expect(gsocket.tries).toEqual(0);
        });

        it('reset should clean up message queue and errors', function() {
            gsocket = new GSocket({});
            gsocket.errors.push('errors');
            gsocket.messages.push('message');
            gsocket.reset();
            expect(gsocket.errors.length).toEqual(0);
            expect(gsocket.messages.length).toEqual(0);
        });

        it('if autoconnect option is true we should connect on constructor', function() {
            var spy = sinon.spy(GSocket.prototype, 'connect');
            gsocket = new GSocket({
                autoconnect: true
            });
            expect(spy).toHaveBeenCalledOnce();
            GSocket.prototype.connect.restore();
        });

        it('if autoconnect option is false we should manually connect', function() {
            var spy = sinon.spy(GSocket.prototype, 'connect');
            gsocket = new GSocket({
                autoconnect: false
            });
            expect(spy.callCount).toEqual(0);
            GSocket.prototype.connect.restore();
        });

        it('clearIds should reset all timeout/intervals and remove ids', function() {
            var spy = sinon.spy(gsocket, 'clearTimeInterval');

            GSocket.timeoutIds.forEach(function(id) {
                gsocket[id] = gsocket.ID;
            });

            gsocket.clearIds();

            GSocket.timeoutIds.forEach(function(id) {
                expect(gsocket[id]).toBeFalsy();
            });

            expect(spy).toHaveBeenCalled(GSocket.timeoutIds.length);

            gsocket.clearTimeInterval.restore();
        });

        it('getRetryTime should return a value capped by maxRetryTime', function() {
            gsocket.maxRetryTime = 3333;
            gsocket.tries = 3335;
            expect(gsocket.getRetryTime() === gsocket.maxRetryTime).toBeTruthy();
        });

        it('handleTimeout should set the state to GSocket.TIMEDOUT', function() {
            gsocket.handleTimeout();
            expect(gsocket.state).toEqual(GSocket.TIMEDOUT);
        });

        it('handleTimeout should close the service layer', function() {
            //We mocked service events as spies, hold a ref to it before
            //we delete it on handleTimeout.
            var serviceClose = gsocket.service.close;
            gsocket.handleTimeout();
            expect(serviceClose).toHaveBeenCalledOnce();
        });

        it('handleTimeout should return false and not retry to connect if reconnectAfterTimeout is set to false', function() {
            var spy = sinon.spy(gsocket, 'onError');
            gsocket.reconnectAfterTimeout = false;
            var out = gsocket.handleTimeout();
            expect(out).toEqual(false);
            expect(spy.callCount).toEqual(0);
            gsocket.onError.restore();
        });

        it('handleTimeout should call retryConnection if reconnectAfterTimeout is set to true', function() {
            var spy = sinon.spy(gsocket, 'retryConnection');
            gsocket.reconnectAfterTimeout = true;
            var out = gsocket.handleTimeout();
            expect(out).toEqual(true);
            expect(spy.callCount).toEqual(1);
            gsocket.retryConnection.restore();
        });

        it('send should buffer messages into queue if service is NOT GSocket.OPEN', function() {
            gsocket.send("message");
            gsocket.send("message");
            gsocket.send("message");
            expect(gsocket.messages.length).toEqual(3);
        });

        it('send should NOT buffer messages into queue if service is GSocket.OPEN', function() {
            gsocket.service.readyState = GSocket.OPEN;
            gsocket.send("message");
            gsocket.send("message");
            gsocket.send("message");
            expect(gsocket.messages.length).toEqual(0);
        });

        it('send will NOT buffer messages if second argument is false', function() {
            gsocket.send("message");
            gsocket.send("message", false);
            gsocket.send("message", false);
            expect(gsocket.messages.length).toEqual(1);
        });

        it('send will add a timestamp to message argument if it is an object', function() {
            gsocket.service.readyState = GSocket.OPEN;
            var message = {};
            gsocket.send(message);
            expect(message).toHaveProperties(['timestamp']);
        });

        it('send will stringify message argument if it is an object', function() {
            gsocket.service.readyState = GSocket.OPEN;
            var message = {
                message: "something"
            };
            gsocket.send(message);
            expect(gsocket.service.send).toHaveBeenCalledOnce();
            var args = gsocket.service.send.args[0];
            expect(args).toHaveLength(1);
            expect(args[0]).toBeOfType('string');
        });

        it('onConnected we should send a handshake', function() {
            var spy = sinon.spy(gsocket, 'sendHandshake');
            gsocket.onConnected();
            expect(spy).toHaveBeenCalledOnce();
        });

        it('onConnected we should send a handshake only if we are not in GSocket.OPEN', function() {
            var spy = sinon.spy(gsocket, 'sendHandshake');
            gsocket.state = GSocket.OPEN;
            gsocket.onConnected();
            expect(spy.callCount).toEqual(0);
        });

        it('onConnected should reset and set state to GSocket.OPEN', function() {
            var spy = sinon.spy(gsocket, 'sendHandshake');
            gsocket.onConnected();
            expect(gsocket.state).toBe(GSocket.OPEN);
            expect(spy.callCount).toEqual(1);
        });

        it('onConnected should flush message queue if there are messages', function() {
            var spy = sinon.spy(gsocket, 'send');
            gsocket.messages.push("message");
            gsocket.messages.push("message");
            gsocket.messages.push("message");
            gsocket.onConnected();
            expect(spy.callCount).toEqual(3);
        });

        it('onConnected should not flush message queue if there are no messages', function() {
            var spy = sinon.spy(gsocket, 'send');
            gsocket.onConnected();
            expect(spy.callCount).toEqual(0);
        });

        it('onConnected should sendHeartbeat', function() {
            var spy = sinon.spy(gsocket, 'sendHeartbeat');
            gsocket.onConnected();
            expect(spy.callCount).toEqual(1);
        });

        it('onConnected should emit connected event', function() {
            var spy = sinon.spy(gsocket, 'emit');
            gsocket.onConnected();
            expect(spy.callCount).toEqual(1);
            var args = spy.args[0];
            expect(args).toHaveLength(1);
            expect(args[0]).toBeOfType('string');
            expect(args[0]).toEqual('connected');
        });

        it('onClosed should sendHeartbeat', function() {
            gsocket.onClosed();
            expect(gsocket.state).toBe(GSocket.CLOSED);
        });

        it('onClosed should emit closing event', function() {
            var spy = sinon.spy(gsocket, 'emit');
            var event = {
                event: 'onclosed',
                message: 'message'
            };
            gsocket.onClosed(event);
            expect(spy.callCount).toEqual(1);
            expect(spy.calledWith('closing', event)).toBeTruthy();
        });

        it('onClosed should return false if it does not have a reconnectOnClose prop', function() {
            delete gsocket.reconnectOnClose;
            var out = gsocket.onClosed(event);
            expect(out).toEqual(false);
        });

        it('onClosed should return false if it does not have an event argument', function() {
            var out = gsocket.onClosed();
            expect(out).toEqual(false);
        });

        it('onClosed should NOT handle error if code 1006 is not present in event', function() {
            var spy = sinon.spy(gsocket, 'onError');
            var event = {
                event: 'onclosed',
                message: 'message'
            };
            var out = gsocket.onClosed(event);
            expect(spy.callCount).toEqual(0);
            expect(spy.calledWith(event)).toBeFalsy();
        });

        it('onClosed should handle error code 1006 by default', function() {
            var spy = sinon.spy(gsocket, 'retryConnection');
            var event = {
                event: 'onclosed',
                message: 'message',
                code: 1006
            };
            var out = gsocket.onClosed(event);
            expect(spy.callCount).toEqual(1);
        });

        it('onMessage should filter event payloads with processPlatformEvent', function() {
            var spy = sinon.spy(gsocket, 'processPlatformEvent');
            var event = {
                data: JSON.stringify({
                    age: 23,
                    email: 'peperone@gmail.com'
                })
            };
            var out = gsocket.onMessage(event);
            expect(spy.callCount).toEqual(1);
            expect(spy.calledWith(event)).toBeTruthy();
        });

        it('onMessage should call onMessageCallback if its defined', function() {
            var spy = sinon.spy();
            gsocket = new GSocket({
                onMessageCallback: spy
            });
            var data = {
                age: 23,
                email: 'peperone@gmail.com'
            };
            var event = {
                data: JSON.stringify(data)
            };
            var out = gsocket.onMessage(event);
            expect(spy.callCount).toEqual(1);

        });

        it('onMessage should trigger an event of message type', function() {
            var spy = sinon.spy(gsocket, 'emit');
            var event = {
                data: JSON.stringify({
                    age: 23,
                    email: 'peperone@gmail.com'
                })
            };
            var out = gsocket.onMessage(event);
            expect(spy.callCount).toEqual(1);
            expect(spy.args[0].length).toEqual(2);
            expect(spy.args[0][0]).toEqual('message');
        });



        it('onError should not log if logErrors is false', function() {
            var logger = {
                error: sinon.spy()
            };
            gsocket = new GSocket({
                logger: logger
            })
            gsocket.logErrors = false;
            gsocket.onError({});
            expect(logger.error.callCount).toEqual(0);
        });

        it('onError should not log if logErrors is false', function() {
            var logger = {
                error: sinon.spy()
            };
            gsocket = new GSocket({
                logErrors: true,
                logger: logger
            });
            gsocket.onError({});
            expect(logger.error.callCount).toEqual(1);
        });

        it('onError should store all errors in the errors array', function() {
            gsocket.onError({});
            gsocket.onError({});
            expect(gsocket.errors).toHaveLength(2);
        });

        it('onError should set state to GSocket.CLOSED if we do not try reconnect', function() {
            //Prevent reconnection
            gsocket.tries = gsocket.maxtries = 3;
            expect(gsocket.state).toNotEqual(GSocket.CLOSED);
            gsocket.onError({});
            expect(gsocket.state).toEqual(GSocket.CLOSED);
        });

        it('onError should set state to GSocket.CLOSING if we try reconnect', function() {
            //Prevent reconnection
            expect(gsocket.state).toNotEqual(GSocket.CLOSED);
            gsocket.onError({});
            expect(gsocket.state).toEqual(GSocket.CLOSED);
        });

        it('onError should emit an event with type "error"', function() {
            var spy = sinon.spy(gsocket, 'emit');
            var event = {
                message: "Error message"
            };
            gsocket.onError(event);
            expect(spy.callCount).toEqual(1);
            expect(spy.args[0].length).toEqual(2);
            expect(spy.args[0][0]).toEqual('error');
        });

        it('retryConnection', function() {});

        it('retryConnection should return false if over max number of tries', function() {
            gsocket.tries = gsocket.maxtries = 3;
            expect(gsocket.retryConnection()).toEqual(false);
        });

        it('retryConnection should reset retry interval id', function() {
            gsocket.retryConnection();
            expect(gsocket.retryId).toBeTruthy();
            gsocket.tries = gsocket.maxtries = 3;
            gsocket.retryConnection();
            expect(gsocket.retryId).toBeFalsy();
        });

        it('retryConnection should try to reconnect if under max number of tries', function() {
            gsocket.retryConnection();
            expect(gsocket.state).toEqual(GSocket.RECONNECTING);
        });

        it('retryConnection should reset timeout before waiting for next reconnect', function() {
            var spy = sinon.spy(gsocket, 'clearTimeInterval');
            gsocket.retryConnection();
            expect(spy).toHaveBeenCalledOnce();
        });

        it('retryConnection should recalculate retry time', function() {
            var spy = sinon.spy(gsocket, 'getRetryTime');
            gsocket.retryConnection();
            expect(spy).toHaveBeenCalledOnce();
        });

        it('retryConnection should call setTimeout', function() {
            var retry = sinon.spy(gsocket, 'getRetryTime');
            var timeout = sinon.spy(gsocket, 'setTimeout');

            gsocket.retryConnection();
            expect(timeout).toHaveBeenCalledOnce();

            var retryTime = retry.returnValues[0];

            //setTimeout's second arg is the
            expect(timeout.args[0][1]).toEqual(retryTime);
        });



        it('sendHeartbeat should bail out if verbosity level is under 2', function() {
            gsocket.verbosity = 1;
            expect(gsocket.sendHeartbeat()).toEqual(false);
        });

        it('sendHeartbeat should trigger interval only the first time is called', function() {
            var spy = sinon.spy(gsocket, 'setInterval');
            gsocket.verbosity = 2;
            gsocket.sendHeartbeat();
            gsocket.sendHeartbeat();
            expect(spy).toHaveBeenCalledOnce();
        });

        it('sendHeartbeat should set interval to be keepalive property', function() {
            var spy = sinon.spy(gsocket, 'setInterval');
            gsocket.verbosity = 2;
            gsocket.sendHeartbeat();
            expect(spy).toHaveBeenCalledOnce();
            expect(spy.args[0][1]).toEqual(gsocket.keepalive);
        });

        it('sendHeartbeat should skip beat if the connection is not open', function() {
            gsocket.verbosity = 2;
            gsocket.state = GSocket.CLOSED;
            var trigger = gsocket.sendHeartbeat();
            var state = gsocket.sendHeartbeat();
            expect(state).toEqual(gsocket.state);
        });

        it('sendHeartbeat should add a timestamp to the heartbeat beat property', function() {
            gsocket.verbosity = 2;
            gsocket.state = GSocket.OPEN;

            gsocket.sendHeartbeat();
            gsocket.sendHeartbeat();

            expect(gsocket.heartbeat.beat).toBeOfType('number');
        });

        it('sendHeartbeat should send the heartbeat to platform', function() {
            var spy = sinon.spy(gsocket, 'send');
            gsocket.verbosity = 2;
            gsocket.state = GSocket.OPEN;

            gsocket.sendHeartbeat();
            gsocket.sendHeartbeat();

            expect(spy).toHaveBeenCalledOnce();
            expect(spy.args[0][0]).toMatchObject(gsocket.heartbeat);
        });

        it('sendHandshake should return false if verbose level does not support handshake', function() {
            gsocket.verbosity = 0;
            expect(gsocket.sendHandshake()).toBe(false);
        });

        it('sendHandshake should send the handshake object to server', function() {
            gsocket.verbosity = 3;
            var spy = sinon.spy(gsocket, 'send');
            gsocket.sendHandshake();
            expect(spy).toHaveBeenCalledOnce();
            expect(spy.args[0][0]).toEqual(gsocket.handshake);
        });

        it('sendHandshake should not queue if there is no connection', function() {
            gsocket.service.readyState = GSocket.CLOSED;
            gsocket.sendHandshake();
            expect(gsocket.messages).toHaveLength(0);
        });

    });

    describe('GSocket', function() {
        var gsocket;

        beforeEach(function() {
            gsocket = new GSocket({});
        });

        it('isValidEndpoint should validate endpoint URL', function() {
            gsocket.endpoint = 'http://localhost:9000/API/websockets';
            expect(gsocket.isValidEndpoint()).toBeFalsy();

            gsocket.endpoint = 'ws://localhost:9000/API/websockets';
            expect(gsocket.isValidEndpoint()).toBeTruthy();

            gsocket.endpoint = 'wss://localhost:9000/API/websockets';
            expect(gsocket.isValidEndpoint()).toBeTruthy();
        });

        it('should have a default platform event processor', function() {
            expect(gsocket).toHaveMethods(['processPlatformEvent']);
        });

        it('processPlatformEvent should parse event string data into object', function() {
            var data = {
                name: 'Peperone',
                age: 23,
                email: 'peperone@gmail.com'
            };
            var event = {
                event: 'scene_change',
                type: 'command'
            };
            event.data = JSON.stringify(data);

            var out = gsocket.processPlatformEvent(event);

            expect(out).toMatchObject(data);
        });

        it('should connect to service', function() {
            gsocket.connect();
            expect(gsocket.service).toBeInstanceOf(MockWebSocket)
        });

        it('after connecting it should be on CONNECTING state', function() {
            gsocket.connect();
            expect(gsocket.state).toEqual(GSocket.CONNECTING);
        });

        it('connect generates a timeoutId', function() {
            gsocket.connect();
            expect(gsocket.timeoutId).toBeTruthy();
        });

        xit('connect should attach listeners for Service events', function() {

            var events = {
                    onerror: 'onError',
                    onopen: 'onConnected',
                    onclose: 'onClosed',
                    onmessage: 'onMessage'
                },
                spies = {};

            var method;

            gsocket = new GSocket({
                config: {
                    provider: function(url) {
                        throw new Error('FAKE ERROR');
                    }
                },
                autoconnect: false

            })
            Object.keys(events).forEach(function(type) {
                method = events[type];
                spies[method] = sinon.spy(gsocket, method);
            });

            gsocket.connect();

            Object.keys(events).forEach(function(type) {
                method = events[type];
                gsocket.service[type].call(gsocket, {});
                expect(spies[method]).toHaveBeenCalled();
            });

        });

        it('should try catch errors on connect from Service', function() {
            gsocket = new GSocket({
                config: {
                    provider: function(url) {
                        throw new Error('FAKE ERROR');
                    }
                },
                autoconnect: false
            });
            gsocket.connect();
            expect(gsocket.state).toEqual(GSocket.CLOSED);
            // expect(gsocket.state).toEqual(GSocket.ERRORED);
            expect(gsocket.errors).toHaveLength(1);
        });

        it('clearIds should reset timeouts', function() {

            GSocket.timeoutIds.forEach(function(id) {
                gsocket[id] = setTimeout(function() {}, 100);
            });

            gsocket.clearIds();

            GSocket.timeoutIds.forEach(function(id) {
                expect(gsocket[id]).toBeFalsy();
            });
        });

        it('connect without an endpoint should throw error', function() {
            gsocket = new GSocket({
                autoconnect: false,
                //We need to remove default endpoint
                endpoint: null
            });

            gsocket.connect();

            expect(gsocket.state).toEqual(GSocket.CLOSED);
            // expect(gsocket.state).toEqual(GSocket.ERRORED);
            expect(gsocket.errors).toHaveLength(1);
        });
    });

    describe('GSocket', function() {
        var gsocket;

        beforeEach(function() {
            gsocket = new GSocket({});
        });

        it('retryConnection should call connect after X milliseconds', function() {
            var retry = sinon.spy(gsocket, 'getRetryTime');
            var connect = sinon.spy(gsocket, 'connect');

            gsocket.retryConnection();

            var retryTime = retry.returnValues[0];
            FakeTimers.tick(retryTime);

            expect(connect).toHaveBeenCalledOnce();
        });

        it('retryConnection should call try to connect maxtries', function() {
            var retry = sinon.spy(gsocket, 'getRetryTime');
            var connect = sinon.spy(gsocket, 'connect');

            gsocket.retryConnection();

            var retryTime;
            // for (; gsocket.tries < 5;) {
            // retryTime = retry.returnValues[gsocket.tries - 1];
            retryTime = retry.returnValues[0];
            console.log('FAIL', retryTime)
            FakeTimers.tick(retryTime + 1);

            retryTime = retry.returnValues[1];
            console.log('FAIL', retryTime)
            FakeTimers.tick(retryTime + 1);

            retryTime = retry.returnValues[2];
            console.log('FAIL', retryTime)
            FakeTimers.tick(retryTime + 1);
            // }

            expect(connect.calls.length).toEqual(3);
        });
    });
});