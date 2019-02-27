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
    	
		var oConfig = load_file( './mysqlimports/basic.yml');
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
});
