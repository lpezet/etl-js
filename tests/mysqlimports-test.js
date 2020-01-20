const assert = require('chai').assert
const TestedClass = require('../lib/mysqlimports');
const load_file = require('./load_file');

describe('mysqlimports',function(){
	
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
	
	it('tagsMultipleValues', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		//assert.include( pCmd, "--fields-enclosed-by='\"'");
    		assert.notInclude( pCmd, "{{ years }}");
    		pCallback( null, "", "");
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
    			root: {
    				"/downloads/{{ years }}.csv": {
						db_name: "testdb",
						fields_enclosed_by: '"'
    				}
    			}
    	};
    	var oContext = {
    			years: [ 2018, 2019, 2020 ]
    	}
    	oTested.handle( 'root', oTemplate['root'], oExecutor, oContext ).then(function( pData ) {
    		console.log('#### Data');
    		console.dir( pData );
    		try {
	    		assert.property( pData['mysqlimports'],  "/downloads/2018.csv" );
	    		assert.property( pData['mysqlimports'],  "/downloads/2019.csv" );
	    		assert.property( pData['mysqlimports'],  "/downloads/2020.csv" );
				done();
    		} catch( e ) {
    			done( e );
    		}
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
	it('enclose',function(done){
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.include( pCmd, "--fields-enclosed-by='\"'");
    		pCallback( null, "", "");
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
    			root: {
    				"/downloads/test.csv": {
						db_name: "testdb",
						fields_enclosed_by: '"'
    				}
    			}
    	};
    	
    	oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
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
						db_name: "testdb"
    				}
    			}
    	};
    	
    	oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
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
						db_name: "testdb"
    				}
    			}
    	};
    	
    	oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
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
						db_name: "testdb"
    				}
    			}
    	};
    	
    	oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
	it('erorExecutingCmd', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( new Error('error'), null, "some stderr");
    	};
		var oExecutor = new ExecutorClass();
		var oTested = new TestedClass();
		
		var oTemplate = load_file( './mysqlimports/basic.yml');
		
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done('Expected error');
		}, function( pError ) {
			//console.log( pError );
			done();
		})
	});

	it('basic',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		switch ( pCmdOpts.context ) {
    			case "/downloads/test.csv":
    				assert.include( pCmd, "testdb");
    				assert.include( pCmd, "--columns=id,field1,field2");
    				assert.include( pCmd, "--compress");
    				assert.include( pCmd, "--debug");
    				assert.include( pCmd, "--debug-check");
    				assert.include( pCmd, "--debug-info");
    				assert.include( pCmd, "--default-auth=mysql_native_password");
    				assert.include( pCmd, "--fields-terminated-by=\"\t\"");
    				assert.include( pCmd, "--force");
    				assert.include( pCmd, "--ignore-lines");
    				assert.include( pCmd, "--ignore");
    				assert.include( pCmd, "--lines-terminated-by=\"\n\"");
    				assert.include( pCmd, "--no-defaults");
    				assert.include( pCmd, "--port=3306");
    				assert.include( pCmd, "--protocol=TCP");
    				assert.include( pCmd, "--replace");
    				assert.include( pCmd, "--secure-auth");
    				assert.include( pCmd, "--tls-ciphersuites=suite1:suite2:suite3");
    				break;
    		}
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = load_file( './mysqlimports/basic.yml');
		
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
		
    	
	});
});
