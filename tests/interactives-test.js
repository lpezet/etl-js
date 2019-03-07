const assert = require('chai').assert
const TestedClass = require('../lib/interactives');
const mockStdIn = require('./my-mock-stdin');

describe('interactives',function(){
	
	
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});
	
	it('mod', function(done) {
		var ETLMock = { mod: function( pKey, pSource, pCallback ) {
			pCallback({"test":true});
		} };
		var oTested = new TestedClass( ETLMock );
		assert.deepEqual( oTested.mSettings, {"test":true} );
		done();
	});
	
	it('basic', function(done) {
		var ExecutorClass = function() {};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					"ask_name": {
						prompt: "Enter your name"
					}
				}
		}
		var stdin = mockStdIn('Schwarzenegger\n');
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function( pData ) {
			try {
				assert.exists( pData['interactives'] );
				assert.exists( pData[ 'interactives' ][ 'ask_name' ] );
				assert.equal( pData[ 'interactives' ][ 'ask_name' ][ 'result' ], 'Schwarzenegger' );
				done();
			} catch(e) {
				done(e);
			} finally {
				stdin.restore();
			}
		}, function( pError ) {
			stdin.restore();
			console.log( pError );
			done( pError );
		})
	});
	
});
