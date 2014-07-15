/*
 * gsocket
 * https://github.com/goliatone/gsocket
 * Created with gbase.
 * Copyright (c) 2014 goliatone
 * Licensed under the MIT license.
 */
/* jshint strict: false, plusplus: true */
/*global define: false, require: false, module: false, exports: false */
define('gsocket', ['extend'], function(extend) {

    /**
     * Extend method.
     * @param  {Object} target Source object
     * @return {Object}        Resulting object from
     *                         meging target to params.
     */
    var _extend = extend;

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



    ///////////////////////////////////////////////////
    // CONSTRUCTOR
    ///////////////////////////////////////////////////

    var options = {

    };

    /**
     * GSocket constructor
     *
     * @param  {object} config Configuration object.
     */
    var GSocket = function(config) {
        config = config || {};

        config = _extend({}, this.constructor.DEFAULS, config);

        this.init(config);
    };

    /*
     * VERSION
     */
    GSocket.VERSION = '0.0.0';

    /**
     * Class name
     * @type {String}
     */
    GSocket.name = GSocket.prototype.name = 'GSocket';


    /**
     * Make default options available so we
     * can override.
     */
    GSocket.DEFAULTS = options;

    ///////////////////////////////////////////////////
    // PRIVATE METHODS
    ///////////////////////////////////////////////////

    GSocket.prototype.init = function(config) {
        if (this.initialized) return this.logger.warn('Already initialized');
        this.initialized = true;

        console.log('GSocket: Init!');
        _extend(this, config);

        return 'This is just a stub!';
    };

    /**
     * Logger method, meant to be implemented by
     * mixin. As a placeholder, we use console if available
     * or a shim if not present.
     */
    GSocket.prototype.logger = _shimConsole(console);

    /**
     * PubSub emit method stub.
     */
    GSocket.prototype.emit = function() {
        this.logger.warn(GSocket, 'emit method is not implemented', arguments);
    };

    return GSocket;
});