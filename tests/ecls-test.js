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
	
	it('mod', function(done) {
		var ETLMock = { mod: function( pKey, pSource, pCallback ) {
			pCallback({});
		} };
		var oTested = new TestedClass( ETLMock );
		assert.deepEqual( oTested.mSettings, {} );
		done();
	});
	
	it('mustSpecifyFileOrContent',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
    	var oTemplate = {
				root: {
					  "000_content": {
					    cluster: "thor",
					    format: "default",
					    output: "test.txt"
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function( pData ) {
			done("Expecting error message saying file or content must be provided.");
		}, function( pError ) {
			console.log( pError );
			done();
		})
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
		});
	});
	
	it('fileWithErrorDownloadingFile',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.indexOf('wget') >= 0 ) {
    			pCallback( new Error("error"), "", "");
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
			done("Should have raised and caught error.");
		}, function( pError ) {
			done();
		});
	});
	
	it('fileWithErrorRunningECL',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.indexOf('wget') < 0 ) {
    			pCallback( new Error("error"), "", "");
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
			done("Should have raised and caught error.");
		}, function( pError ) {
			done();
		});
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
	
	it('contentWithErrorCreatingFile',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( new Error("error"), "", "some stderr stuff");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( './ecls/content.yml');
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function( pData ) {
			done("Should have raised and caught error.");
		}, function( pError ) {
			done();
		})
		
    	
	});
	
	it('contentWithErrorRunningECL',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( new Error("error"), "", "somestderr stuff");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( './ecls/content.yml');
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function( pData ) {
			done("Should have raised and caught error.");
		}, function( pError ) {
			//console.log( pError );
			done();
		})
		
    	
	});
	
	it('formatAndOutput',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.include( pCmd, "cluster=thor");
    		assert.include( pCmd, "format=default");
    		assert.include( pCmd, "output=test.txt");
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					  "000_content": {
					    cluster: "thor",
					    content: "something",
					    format: "default",
					    output: "test.txt"
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function( pData ) {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
	});
});
