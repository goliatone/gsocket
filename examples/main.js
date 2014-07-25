/*global define:true requirejs:true*/
/* jshint strict: false */
requirejs.config({
    paths: {
        'jquery': 'jquery/jquery',
        'extend': 'gextend/extend',
        'gsocket': 'gsocket'
    }
});

define(['gsocket', 'jquery'], function(GSocket, $) {
    console.log('Loading');
    var gsocket = new GSocket({
        endpoint: 'ws://localhost:9003',
        endpoint: 'ws://localhost:9002',
        emit: console
    });
    window.gs = gsocket;
});