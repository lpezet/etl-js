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
			pCallback({});
		} };
		var oTested = new TestedClass( ETLMock );
		assert.deepEqual( oTested.mSettings, {} );
		done();
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
	
	it('apply_settings',function(done){
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

	it('basic',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		switch ( pCmdOpts.context ) {
    			case "/downloads/test.csv":
    				assert.include( pCmd, "--db_name=testdb");
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
		})
		
    	
	});
});
