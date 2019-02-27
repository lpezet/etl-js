const assert = require('chai').assert
const TestedClass = require('../lib/mysqls');
const load_file = require('./load_file');

describe('mysqls',function(){
	
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});
	
	it('mod', function(done) {
		var ETLMock = { mod: function( pKey, pSource, pCallback ) {
			pCallback({});
		} };
		var oTested = new TestedClass( ETLMock );
		assert.deepEqual( oTested.mSettings, {} );
		done();
	});
	
	it('apply_settings_parent',function(done){
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.include( pCmd, '--bind-address=127.0.0.1');
    		assert.include( pCmd, '--silent');
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oSettings = {
				'root': {
					bind_address: '127.0.0.1',
					silent: true
				}
		};
		var oTested = new TestedClass( null, oSettings );
		
		var oTemplate = {
    			root: {
    				"/downloads/test.csv": {
						db_name: "testdb",
					    execute: "SELECT * FROM test"
				    }
    			}
    	};
    	
    	oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
	});
	
	it('apply_settings_key',function(done){
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.include( pCmd, '--bind-address=127.0.0.1');
    		assert.include( pCmd, '--silent');
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oSettings = {
				'/downloads/test.csv': {
					bind_address: '127.0.0.1',
					silent: true
				}
		};
		var oTested = new TestedClass( null, oSettings );
		
		var oTemplate = {
    			root: {
    				"/downloads/test.csv": {
						db_name: "testdb",
					    execute: "SELECT * FROM test"
				    }
    			}
    	};
    	
    	oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
	});
	
	it('apply_settings_all',function(done){
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.include( pCmd, '--bind-address=127.0.0.1');
    		assert.include( pCmd, '--silent');
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oSettings = {
				'*': {
					bind_address: '127.0.0.1',
					silent: true
				}
		};
		var oTested = new TestedClass( null, oSettings );
		
		var oTemplate = {
    			root: {
    				"/downloads/test.csv": {
						db_name: "testdb",
					    execute: "SELECT * FROM test"
				    }
    			}
    	};
    	
    	oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
	});

	it('basic',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		switch ( pCmdOpts.context ) {
    			case "/a/b/c.txt":
    				assert.include( pCmd, "--execute='SELECT * FROM test'");
    				break;
    		}
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( './mysqls/basic.yml');
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
});
