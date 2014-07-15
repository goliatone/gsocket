/*global define:true requirejs:true*/
/* jshint strict: false */
requirejs.config({
    paths: {
        'jquery': 'jquery/jquery',
        'gsocket': 'gsocket'
    }
});

define(['gsocket', 'jquery'], function (GSocket, $) {
    console.log('Loading');
	var gsocket = new GSocket();
	gsocket.init();
});