const assert = require('chai').assert
const load_file = require('./load_file');
const TestedClass = require('../lib/commands');

describe('commands',function(){
	
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
	
	it('tags', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		try {
	    		assert.equal(typeof( pCmd ), 'string');
	    		if ( pCmd.indexOf("echo \"continue\"") >= 0 ) {
	    			assert.notInclude( pCmd, "{{ tag1 }}");
	    		}
	    		pCallback( null, pCmd, "");
    		} catch (e) {
    			pCallback( e, pCmd, "");
    		}
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					"hello": {
						command: "echo {{ tag1 }}",
						test: '[ "{{ tag1 }}" == "hello"]'
					}
				}
		}
		var oContext = {
				tag1: "hello"
		}
		oTested.handle( 'root', oTemplate['root'], oExecutor, oContext ).then(function( pData ) {
			try {
				console.log('Data=');
				console.log(JSON.stringify( pData ));
				assert.exists( pData );
				assert.isFalse( pData['exit'] );
				assert.isFalse( pData['skip'] );
				assert.exists( pData['results'] );
				assert.equal( pData['results'].length, 1);
				var result = pData['results'][0];
				assert.equal( result['command'], 'hello' );
				assert.exists( result['results'] );
				assert.deepEqual( result['results'], {"error":null,"result":"echo hello","message":null,"exit":false,"pass":true,"_stdout":"echo hello","_stderr":""} );
				done();
			} catch (e) {
				done(e);
			}
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	})
	
	it('result_as_normal', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback(null, '[ "Toto", "Tutu" ]');
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					"001_json": {
						command: "dontmatter",
						result_as_json: false,
						var: "myvar"
					}
				}
		}
		var oContext = { env: {}, vars: {} };
		oTested.handle( 'root', oTemplate['root'], oExecutor, oContext ).then(function( pData ) {
			try {
				//assert.exists( pData['commands'] );
				//assert.exists( pData[ 'commands' ][ '001_json' ] );
				//assert.isNotArray( pData[ 'commands' ][ '001_json' ][ 'result' ] );	
				assert.deepEqual( oContext, { env: {}, vars: { myvar: '[ "Toto", "Tutu" ]'}});
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
	it('result_as_json', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback(null, '[ "Toto", "Tutu" ]');
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					"001_json": {
						command: "dontmatter",
						result_as_json: true,
						var: "myvar"
					}
				}
		}
		
		var oContext = { env: {}, vars: {} };
		oTested.handle( 'root', oTemplate['root'], oExecutor, oContext ).then(function( pData ) {
			try {
				//assert.exists( pData['commands'] );
				//assert.exists( pData[ 'commands' ][ '001_json' ] );
				//assert.isArray( pData[ 'commands' ][ '001_json' ][ 'result' ] );	
				assert.deepEqual( oContext, { env: {}, vars: { myvar: [ "Toto", "Tutu" ]}});
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
	it('invalid_json_result_as_json', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		// Evil: single quotes are not valid in JSON...
    		pCallback(null, "[ 'Toto', 'Tutu' ]");
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					"001_json": {
						command: "dontmatter",
						result_as_json: true,
						var: "myvar"
					}
				}
		}
		
		var oContext = { env: {}, vars: {} };
		oTested.handle( 'root', oTemplate['root'], oExecutor, oContext ).then(function( pData ) {
			try {
				//assert.exists( pData['commands'] );
				//assert.exists( pData[ 'commands' ][ '001_json' ] );
				//assert.isNotArray( pData[ 'commands' ][ '001_json' ][ 'result' ] );	
				//assert.equal( pData[ 'commands' ][ '001_json' ][ 'result' ], "[ 'Toto', 'Tutu' ]" );	
				assert.deepEqual( oContext, { env: {}, vars: { myvar: "[ 'Toto', 'Tutu' ]"}});
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
	it('invalidTestOutput',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, null, "" );
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					  "001_test": {
					    command: "gunzip test.gz",
					    test: "[ ! -f test.gz ]"
					  }
				}
		};
		
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			done( pError );
		});
	});
	
	//TODO: Somehow, right now, when a command fails, it will keep going...
	it('nullExecutor',function(done){
		var oSettings = {};
		var oTested = new TestedClass( null, oSettings );
		var oTemplate = {
				root: {
					  "001_test": {
					    command: "gunzip test.gz"
					  }
				}
		};
    	oTested.handle( 'root', oTemplate['root'], null ).then(function() {
			done();
		}, function( pError ) {
			done( pError );
		});
	});
	
	it('exitOnError',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( new Error('test error'), null, null );
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					  "001_test": {
					    command: "gunzip test.gz",
					    exit_on_error: true
					  }
				}
		};
		
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function( data ) {
			console.log('data=');
			console.dir(data);
			done('Expecting error');
		}, function( pError ) {
			console.log('Error:');
			console.dir( pError );
			done();
		});
	});
	
	//TODO: Somehow, right now, when a command fails, it will keep going...
	it('errorExecutingCmd',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( new Error("error"), "", "stderr stuff" );
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					  "001_test": {
					    command: "gunzip test.gz"
					  }
				}
		};
		
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done('Expecting error');
		}, function( pError ) {
			done();
		})
	});
	it('errorExecutingCmdIgnoreErrors',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( new Error("error"), "", "stderr stuff" );
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					  "001_test": {
					    command: "gunzip test.gz",
					    ignore_errors: true
					  }
				}
		};
		
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			done('Not expecting an error! Should be ignoring the error.');
		})
	});
	
	it('tagsReal', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.equal( pCmd, "gunzip 2019.zip" );
    		pCallback( null, null, "" );
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oTemplate = {
				root: {
					  "001_test": {
					    command: "gunzip {{ vars.myvar }}.zip"
					  }
				}
		};
		
		oTested.handle( 'root', oTemplate['root'], oExecutor, { env: {}, vars: { myvar: "2019" } } ).then(function() {
			done();
		}, function( pError ) {
			done( pError );
		});
	});

	it('basic',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.isNotNull( pCallback );
    		var error = null;
    		var stdout = "";
    		var stderr = "";
    		switch( pCmdOpts.context ) {
    			case "001_test":
    				if ( pCmd.startsWith("gunzip") ) {
	    				assert.equal(pCmd, "gunzip test.gz");
	        			assert.isNotEmpty( pCmdOpts );
	        			assert.equal( pCmdOpts.cwd, "/var/lib/somedir");
    				} else {
    					assert.equal(pCmd, '([ -f test.gz ]) && echo "continue" || echo "stop"');
            			//assert.isEmpty( pCmdOpts );
            			stdout="continue";
    	    		}
        			break;
    			case "002_test_fail":
    				stdout = "stop";
    				break;
    			case "005_test_error":
    				error = { code: 1 };
    				break;
    		}
    		pCallback( error, stdout, stderr );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( "./commands/basic.yml" );
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
});
