/*global define:true, describe:true , it:true , expect:true, 
beforeEach:true, sinon:true, spyOn:true , expect:true */
/* jshint strict: false */
define(['gsocket', 'jquery'], function(GSocket, $) {

    describe('just checking', function() {

        it('GSocket should be loaded', function() {
            expect(GSocket).toBeTruthy();
            var gsocket = new GSocket();
            expect(gsocket).toBeTruthy();
        });

        it('GSocket should initialize', function() {
            var gsocket = new GSocket();
            var output   = gsocket.init();
            var expected = 'This is just a stub!';
            expect(output).toEqual(expected);
        });
        
    });

});