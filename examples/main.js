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
        endpoint: 'ws://localhost:9000',
        emit: function() {
            console.log(arguments)
        }
    });

    window.gs = gsocket;
});