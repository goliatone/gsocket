/*global define:true, describe:true , it:true , expect:true,
beforeEach:true, sinon:true, spyOn:true , expect:true */
/* jshint strict: false */
define(['gsocket'], function(GSocket) {
    window.GSocket = GSocket;

    var noop = function() {};

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

    GSocket.DEFAULTS.emit = noop;
    GSocket.DEFAULTS.reconnectAfterTimeout = false;

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
            expect(gsocket.state).toEqual(GSocket.ERRORED);
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

            expect(gsocket.state).toEqual(GSocket.ERRORED);
            expect(gsocket.errors).toHaveLength(1);
        });
    });
});