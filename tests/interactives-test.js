const chai = require('chai');
const assert = chai.assert
const spies = require('chai-spies');
chai.use(spies);
const TestedClass = require('../lib/interactives');
const EventEmitter = require('events').EventEmitter;

describe('interactives',function(){
	
	class FakeStream extends EventEmitter {
	  resume() {}
	  pause() {}
	  write() {}
	  end() {}
	}
	
	
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
	
	it('questionError', function(done) {
		var ExecutorClass = function() {};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	oTested._exec = function() {
    		return function() {
    			return Promise.reject( { error: new Error('error') } );
    		}
    	};
    	var oTemplate = {
				root: {
					"ask_name": {
						prompt: "Enter your name"
					}
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function( pData ) {
			done('Expected error');
		}, function( pError ) {
			done();
		});
	});
	
	it('execError', function(done) {
		var ExecutorClass = function() {};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	oTested._exec = function() {
    		throw new Error('error');
    	};
    	var oTemplate = {
				root: {
					"ask_name": {
						prompt: "Enter your name"
					}
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function( pData ) {
			done('Expected error');
		}, function( pError ) {
			done();
		});
	});
	
	it('basic', function(done) {
		var ExecutorClass = function() {};
    	var oExecutor = new ExecutorClass();
    	var fs = new FakeStream();
    	var oSettings = { input: fs, output: fs };
    	var oTested = new TestedClass( null, oSettings );
    	
		var oTemplate = {
				root: {
					"ask_name": {
						prompt: "Enter your name"
					}
				}
		}
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function( pData ) {
			try {
				assert.exists( pData['interactives'] );
				assert.exists( pData[ 'interactives' ][ 'ask_name' ] );
				assert.equal( pData[ 'interactives' ][ 'ask_name' ][ 'result' ], 'Schwarzenegger' );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
		setTimeout(function() {
			fs.emit('data', 'Schwarzenegger\n');
		}, 0);
	});
	
});
