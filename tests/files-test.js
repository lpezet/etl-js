const assert = require('chai').assert
const load_file = require('./load_file');
const TestedClass = require('../lib/files');

describe('files',function(){
	
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
	
	it('mismatchSourcesAndTargets',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, "", "" );
    	};
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					  "/tmp/{{tag1}}/{{tag2}}.txt": {
					    source: "https://abc.def.com/{{tags}}.txt"
					  }
				}
		}
		var oContext = {
			tag1: "hello",
			tag2: "world",
			tags: [ "a", "b" ]
		};
		oTested.handle( 'root' , oTemplate['root'], oExecutor, {}, oContext).then(function( pData ) {
			done("Expecting error.");
		}, function( pError ) {
			console.log( pError );
			done();
		})
	});
	
	
	it('downloadError',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( new Error("error"), "", "some stderr stuff" );
    	};
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( "./files/basic.yml" );
		
		oTested.handle( 'root' , oConfig['root'], oExecutor ).then(function( pData ) {
			done("Expecting error.");
		}, function( pError ) {
			done();
		})
	});
	
	it('contentError',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, "", "");
    	};
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( new Error("error"), "", "some stderr stuff" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
    	var oTemplate = {
				root: {
					  "/tmp/toto.txt": {
					    content: "some content"
					  }
				}
		}
		
		oTested.handle( 'root' , oTemplate['root'], oExecutor ).then(function( pData ) {
			done("Expecting error.");
		}, function( pError ) {
			done();
		})
	});

	it('basic',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.equal( pCmd, '[ ! -d $(dirname "/tmp/file.txt") ] && mkdir -p $(dirname "/tmp/file.txt"); wget -O "/tmp/file.txt" "https://abc.def.com/file.txt" 2>&1');
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( "./files/basic.yml" );
		
		oTested.handle( 'root' , oConfig['root'], oExecutor ).then(function( pData ) {
			assert.isNotNull( pData );
			assert.isNotNull( pData['files'] );
			assert.isNotNull( pData['files']['/tmp/file.txt'] );
			assert.isNull( pData['files']['/tmp/file.txt']['error'] );
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
	it('source',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.equal( pCmd, '[ ! -d $(dirname "/tmp/file.txt") ] && mkdir -p $(dirname "/tmp/file.txt"); wget -O "/tmp/file.txt" "https://abc.def.com/file.txt" 2>&1');
    		pCallback( null, "", "" );
    	}
    	ExecutorClass.prototype.writeFile = function( pCmd, pCmdOpts, pCallback ) {
    		done("Not expected executor.writeFile() call.");
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = {
				'root': {
					"/tmp/file.txt": {
						source: "https://abc.def.com/file.txt"
					}
				}
		}
		
		oTested.handle( 'root' , oConfig['root'], oExecutor ).then(function( pData ) {
			assert.isNotNull( pData );
			assert.isNotNull( pData['files'] );
			assert.isNotNull( pData['files']['/tmp/file.txt'] );
			assert.isNull( pData['files']['/tmp/file.txt']['error'] );
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
	it('source_with_perms',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.startsWith( '[ ! -d $(dirname "/tmp/file.txt") ]' )) {
    			assert.equal( pCmd, '[ ! -d $(dirname "/tmp/file.txt") ] && mkdir -p $(dirname "/tmp/file.txt"); wget -O "/tmp/file.txt" "https://abc.def.com/file.txt" 2>&1');
    		} else if ( pCmd.startsWith( '[ -f "/tmp/file.txt" ]' ) ) {
    			assert.include(pCmd, 'chmod 600');
        		assert.include(pCmd, 'chgrp titi');
        		assert.include(pCmd, 'chown toto');
    		} else {
    			assert.fail('Unexpected command: ' + pCmd);
    		}
    		pCallback( null, "", "" );
    	}
    	ExecutorClass.prototype.writeFile = function( pCmd, pCmdOpts, pCallback ) {
    		done("Not expected executor.writeFile() call.");
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = {
				'root': {
					"/tmp/file.txt": {
						source: "https://abc.def.com/file.txt",
						mode: '600',
						owner: 'toto',
						group: 'titi'
					}
				}
		}
		
		oTested.handle( 'root' , oConfig['root'], oExecutor ).then(function( pData ) {
			assert.isNotNull( pData );
			assert.isNotNull( pData['files'] );
			assert.isNotNull( pData['files']['/tmp/file.txt'] );
			assert.isNull( pData['files']['/tmp/file.txt']['error'] );
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});

	it('content',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		done("Not expected executor.exec() call.");
    		pCallback( null, "", "" );
    	}
    	ExecutorClass.prototype.writeFile = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = {
				'root': {
					"/tmp/file.txt": {
						content: "Hello world"
					}
				}
		}
		
		oTested.handle( 'root' , oConfig['root'], oExecutor ).then(function( pData ) {
			assert.isNotNull( pData );
			assert.isNotNull( pData['files'] );
			assert.isNotNull( pData['files']['/tmp/file.txt'] );
			assert.isNull( pData['files']['/tmp/file.txt']['error'] );
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
	it('content_with_perms',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.include(pCmd, 'chmod 600');
    		assert.include(pCmd, 'chgrp titi');
    		assert.include(pCmd, 'chown toto');
    		pCallback( null, "", "" );
    	}
    	ExecutorClass.prototype.writeFile = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = {
				'root': {
					"/tmp/file.txt": {
						content: "Hello world",
						mode: '600',
						owner: 'toto',
						group: 'titi'
					}
				}
		}
		
		oTested.handle( 'root' , oConfig['root'], oExecutor ).then(function( pData ) {
			assert.isNotNull( pData );
			assert.isNotNull( pData['files'] );
			assert.isNotNull( pData['files']['/tmp/file.txt'] );
			assert.isNull( pData['files']['/tmp/file.txt']['error'] );
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
	it('templateSingleValue',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.include( pCmd, "https://abc.def.com/toto.txt" );
    		pCallback( null, "", "" );
    	}
    	ExecutorClass.prototype.writeFile = function( pCmd, pCmdOpts, pCallback ) {
    		done("Not expected executor.writeFile() call.");
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = {
				'root': {
					"/tmp/file.txt": {
						source: "https://abc.def.com/{{ $.step1.commands.001_doit.result }}.txt"
					}
				}
		};
		
		var oContext = {
				step1: {
					commands: {
						"001_doit": {
							result: "toto"
						}
					}
				}
		};
		
		oTested.handle( 'root' , oConfig['root'], oExecutor, {}, oContext ).then(function( pData ) {
			assert.isNotNull( pData );
			assert.isNotNull( pData['files'] );
			assert.isNotNull( pData['files']['/tmp/file.txt'] );
			assert.isNull( pData['files']['/tmp/file.txt']['error'] );
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
	it('templateMultipleValues',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		//console.log('Cmd= ' + pCmd );
    		if ( pCmd.indexOf("https://abc.def.com/toto.txt") >= 0) {
    			assert.include( pCmd, "/tmp/toto.txt" );
    		} else if ( pCmd.indexOf("https://abc.def.com/titi.txt") >=0  ) {
    			assert.include( pCmd, "/tmp/titi.txt" );
    		} else {
    			assert.include( pCmd, "https://a.b.c/static.txt" );
    		}
    		pCallback( null, "", "" );
    	}
    	ExecutorClass.prototype.writeFile = function( pCmd, pCmdOpts, pCallback ) {
    		done("Not expected executor.writeFile() call.");
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = {
				'root': {
					"/tmp/{{ $.step1.commands.001_doit.result }}.txt": {
						source: "https://abc.def.com/{{ $.step1.commands.001_doit.result }}.txt"
					},
					"/tmp/static.txt": {
						source: "https://a.b.c/static.txt"
					}
				}
		};
		
		var oContext = {
				step1: {
					commands: {
						"001_doit": {
							result: [ 'toto', 'titi' ]
						}
					}
				}
		};
		
		oTested.handle( 'root' , oConfig['root'], oExecutor, {}, oContext ).then(function( pData ) {
			assert.isNotNull( pData );
			assert.isNotNull( pData['files'] );
			assert.isNotNull( pData['files']['/tmp/toto.txt'] );
			assert.isNull( pData['files']['/tmp/toto.txt']['error'] );
			assert.isNotNull( pData['files']['/tmp/titi.txt'] );
			assert.isNull( pData['files']['/tmp/titi.txt']['error'] );
			assert.isNotNull( pData['files']['/tmp/static.txt'] );
			assert.isNull( pData['files']['/tmp/static.txt']['error'] );
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
});
