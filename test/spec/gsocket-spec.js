/*global define:true, describe:true , it:true , expect:true,
beforeEach:true, sinon:true, spyOn:true , expect:true */
/* jshint strict: false */
define(['gsocket'], function(GSocket) {

    var MockWebSocket = function(url, protocols) {
        this.created = true;
        this.url = url;
        this.protocols = protocols;
    };
    MockWebSocket.prototype.close = function() {};
    MockWebSocket.prototype.onopen = function() {};
    MockWebSocket.prototype.onclose = function() {};
    MockWebSocket.prototype.onmessage = function() {};
    MockWebSocket.prototype.onerror = function() {};
    MockWebSocket.prototype.send = function() {};

    describe('GSocket', function() {
        var gsocket;

        beforeEach(function() {
            gsocket = new GSocket();
        });

        it('should be loaded', function() {
            expect(GSocket).toBeTruthy();
            window.gsocket = gsocket;
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

        xit('once initialized it should not execute the init method more than once', function() {
            var spy = sinon.spy(GSocket, 'extend');
            gsocket = new GSocket({});
            gsocket.init();
            expect(gsocket.initialized).toBeTruthy();
            expect(spy).toHaveBeenCalledTwice();
            GSocket.extend.restore();
        });
    });

    describe('GSocket', function() {
        var gsocket;

        beforeEach(function() {
            gsocket = new GSocket({
                config: {
                    provider: function(url) {
                        return new MockWebSocket(url);
                    }
                }
            })
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

        it('connect should attach listeners for Service events', function() {
            var events = {
                onerror: 'onError',
                onopen: 'onConnected',
                onclose: 'onClosed',
                onmessage: 'onMessage'
            };

            var method;

            Object.keys(events).forEach(function(type) {
                method = events[type];
                gsocket[method] = sinon.spy();
            });

            gsocket.connect();

            Object.keys(events).forEach(function(type) {
                method = events[type];
                gsocket.service[type].call(gsocket, {});
                expect(gsocket[method]).toHaveBeenCalled();
            });
        });

        it('should try catch erros on connect from Service', function() {
            gsocket = new GSocket({
                config: {
                    provider: function(url) {
                        throw new Error('FAKE ERROR');
                    }
                }
            });
            gsocket.connect();
            expect(gsocket.state).toEqual(GSocket.ERRORED);
            expect(gsocket.errors).toHaveLength(1);
        });

        it('clearIds should reset timeouts', function() {

            GSocket.timeoutIds.forEach(function(id) {
                gsocket[id] = setTimeout(function() {
                    console.log('KDKDKDKD')
                }, 100);
            });

            gsocket.clearIds();

            GSocket.timeoutIds.forEach(function(id) {
                expect(gsocket[id]).toBeFalsy();
            });
        });
    });
});