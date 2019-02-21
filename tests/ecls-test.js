const assert = require('chai').assert
const TestedClass = require('../lib/ecls');
const load_file = require('./load_file');

describe('ecls',function(){
	
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});

	it('file',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.indexOf('wget') < 0 ) {
	    		assert.include( pCmd, "cluster=thor");
	    		assert.notInclude( pCmd, "format=null");
	    		assert.notInclude( pCmd, "output=null");
    		}
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( './ecls/file.yml');
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
	
	it('content',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.include( pCmd, "cluster=thor");
    		assert.notInclude( pCmd, "format=null");
    		assert.notInclude( pCmd, "output=null");
    		
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( './ecls/content.yml');
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function( pData ) {
			//console.log('#### ecls content: ');
			//console.dir( pData );
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
});