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
			pCallback({"test":true});
		} };
		var oTested = new TestedClass( ETLMock );
		assert.deepEqual( oTested.mSettings, {"test":true} );
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
	
	it('nullExecutor',function(done){
		var oSettings = {};
		var oTested = new TestedClass( null, oSettings );
		
		var oTemplate = {
    			root: {
    				"/downloads/test.csv": {
						db_name: "testdb",
					    execute: "SELECT * FROM test"
				    }
    			}
    	};
    	oTested.handle( 'root', oTemplate['root'], null ).then(function() {
			done('Expected error');
		}, function( pError ) {
			done();
		});
	});
	
	it('errorExecutingCmd',function(done){
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( new Error("error"), "", "some stderr stuff");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oSettings = {};
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
			done('Expected error');
		}, function( pError ) {
			done();
		});
	});

	it('basic',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		switch ( pCmdOpts.context ) {
    			case "/a/b/c.txt":
    				assert.include( pCmd, "--execute='SELECT * FROM test'");
    				assert.include( pCmd, "--auto-rehash");
    				assert.include( pCmd, "--binary-as-hex");
    				assert.include( pCmd, "--binary-mode");
    				assert.include( pCmd, "--columns=id,field1,field2");
    				assert.include( pCmd, "--comments");
    				assert.include( pCmd, "--compress");
    				assert.include( pCmd, "--debug");
    				assert.include( pCmd, "--debug-check");
    				assert.include( pCmd, "--debug-info");
    				assert.include( pCmd, "--default-auth=mysql_native_password");
    				assert.include( pCmd, "--delimiter=,");
    				assert.include( pCmd, "--force");
    				assert.include( pCmd, "--html");
    				assert.include( pCmd, "--ignore-spaces");
    				assert.include( pCmd, "--line-numbers");
    				assert.include( pCmd, "--no-beep");
    				assert.include( pCmd, "--no-defaults");
    				assert.include( pCmd, "--one-database");
    				assert.include( pCmd, "--port=3306");
    				assert.include( pCmd, "--protocol=TCP");
    				assert.include( pCmd, "--quick");
    				assert.include( pCmd, "--raw");
    				assert.include( pCmd, "--reconnect");
    				assert.include( pCmd, "--safe-updates");
    				assert.include( pCmd, "--secure-auth");
    				assert.include( pCmd, "--select_limit=1000");
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
