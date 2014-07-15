/*
 * gkeypath
 * https://github.com/goliatone/gkeypath
 * Created with gbase.
 * Copyright (c) 2014 goliatone
 * Licensed under the MIT license.
 */
/* jshint strict: false, plusplus: true */
/*global define: false, require: false, module: false, exports: false */
/*(function(root, name, deps, factory) {
    "use strict";
    // Node
    if (typeof deps === 'function') {
        factory = deps;
        deps = [];
    }

    if (typeof exports === 'object') {
        module.exports = factory.apply(root, deps.map(require));
    } else if (typeof define === 'function' && 'amd' in define) {
        //require js, here we assume the file is named as the lower
        //case module name.
        define(name.toLowerCase(), deps, factory);
    } else {
        // Browser
        var d, i = 0,
            global = root,
            old = global[name],
            mod;
        while ((d = deps[i]) !== undefined) deps[i++] = root[d];
        global[name] = mod = factory.apply(global, deps);
        //Export no 'conflict module', aliases the module.
        mod.noConflict = function() {
            global[name] = old;
            return mod;
        };
    }
}(this, "keypath", function() {*/
define("keypath", function() {

    var Keypath = {};

    Keypath.VERSION = '0.1.5';

    Keypath.set = function(target, path, value) {
        if (!target) return undefined;

        var keys = path.split('.');
        path = keys.pop();
        keys.forEach(function(prop) {
            if (!target[prop]) target[prop] = {};
            target = target[prop];
        });

        target[path] = value;

        return target;
    };

    Keypath.get = function(target, path, defaultValue) {
        if (!target || !path) return false;
        path = path.split('.');
        var l = path.length,
            i = 0,
            p = '';
        for (; i < l; ++i) {
            p = path[i];
            if (target.hasOwnProperty(p)) target = target[p];
            else return defaultValue;
        }
        return target;
    };

    Keypath.has = function(target, path) {
        return this.get(target, path, '#$#NFV#$#') !== '#$#NFV#$#';
    };

    return Keypath;
})
// );