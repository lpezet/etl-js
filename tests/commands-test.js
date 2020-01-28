const assert = require('chai').assert
const load_file = require('./load_file');
const TestedClass = require('../lib/commands');
const SimpleLogger = require('../lib/logger');

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
	
	it('tagsAdvanced', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		try {
	    		assert.equal(typeof( pCmd ), 'string');
	    		if ( pCmd.indexOf("echo \"continue\"") >= 0 ) {
	    			assert.notInclude( pCmd, "{{ tag1 }}");
	    		}
	    		
	    		if ( pCmd.indexOf("2019 -eq 2019") >= 0) {
	    			pCallback( null, "stop", ""); // making test fail
	    		} else {
	    			pCallback( null, pCmd, "");
	    		}
    		} catch (e) {
    			pCallback( e, pCmd, "");
    		}
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass(null, null, new SimpleLogger({ level: 'debug' }));
    	
		var oTemplate = {
				root: {
					"hello_{{years}}": {
						command: "echo {{ years }}",
						test: "{{years}} -eq 2019",
						skip_on_test_failed: true
					}
				}
		}
		var oContext = {
				years: [ "2018", "2019", "2020" ]
		}
		oTested.handle( 'root', oTemplate['root'], oExecutor, oContext ).then(function( pData ) {
			try {
				//console.log('Data=');
				//console.log(JSON.stringify( pData ));
				assert.exists( pData.results );
				assert.isTrue( pData.skip );
				assert.isFalse( pData.exit );
				pData.results.forEach( function(e,i) {
					var oCmd = e['command'];
					if ( oCmd !== "hello_2018" && oCmd !== "hello_2019" ) {
						fail("Unexpected command: " + oCmd + ". Should have stopped at 2019.");
					}
				});
				done();
			} catch (e) {
				done(e);
			}
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	})
	
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
	
	it('invalid_test_output',function(done){
    	
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
	it('null_executor',function(done){
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
	
	it('exit_on_error',function(done){
    	
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
	it('error_executing_cmd',function(done){
    	
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
	it('error_executing_cmd_ignore_errors',function(done){
    	
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
	
	it('tags_real', function(done) {
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
	
	it('executor_throwing_exception_in_cmd',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		throw new Error("this is a dummy error");
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "001_unzip": {
					    command: "gunzip my.zip"
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done("Expected rejection.");
		}, function( pError ) {
			console.log( pError );
			done();
		})
	});
	
	it('executor_throwing_exception_in_test',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		throw new Error("this is a dummy error");
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "001_unzip": {
					    command: "gunzip my.zip",
					    test: "somethig"
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			done( pError );
		})
	});
	
	it('error_in_cmd_after_test_passed',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.match(/something/g) ) pCallback(null, 'continue');
    		throw new Error("this is a dummy error");
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "001_unzip": {
					    command: "gunzip my.zip",
					    test: "something"
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done("Expected rejection.");
		}, function( pError ) {
			done();
		})
	});
	
	it('exit_on_test_failed',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.match(/something/g) ) pCallback(null, 'stop');
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "001_unzip": {
					    command: "gunzip my.zip",
					    test: "something",
					    exit_on_test_failed: true
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function(data) {
			try {
				assert.isTrue( data['exit'] );
				assert.isFalse( data['skip'] );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		})
	});
	
	it('exit_on_test_error',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.match(/something/g) ) pCallback('dummey error', null);
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "001_unzip": {
					    command: "gunzip my.zip",
					    test: "something",
					    exit_on_test_failed: true
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function(data) {
			try {
				assert.isTrue( data['exit'] );
				assert.isFalse( data['skip'] );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		})
	});
	
	it('no_exit_on_test_failed',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.match(/something/g) ) pCallback(null, 'stop');
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "001_unzip": {
					    command: "gunzip my.zip",
					    test: "something",
					    exit_on_test_failed: false
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function(data) {
			try {
				assert.isFalse( data['exit'] );
				assert.isFalse( data['skip'] );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		})
	});
	
	it('no_exit_on_test_error',function(done){
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.match(/something/g) ) pCallback('dummey error', null);
    	}
    	var oExecutor = new ExecutorClass();
    	var oLogger = new SimpleLogger({ level: 'info' });
		var oETL = new function() {
    		return {
    			mod: function( key, target, callback ) {
    				callback( {}, oLogger );
    			}
    		}
    	}
    	var oTested = new TestedClass( oETL );
    	var oTemplate = {
				root: {
					  "001_unzip": {
					    command: "gunzip my.zip",
					    test: "something",
					    exit_on_test_failed: false
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function(data) {
			try {
				assert.isFalse( data['exit'] );
				assert.isFalse( data['skip'] );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		})
	});
	
	it('skip_on_test_failed',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.match(/something/g) ) pCallback(null, 'stop');
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "001_unzip": {
					    command: "gunzip my.zip",
					    test: "something",
					    skip_on_test_failed: true
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function(data) {
			try {
				assert.isFalse( data['exit'] );
				assert.isTrue( data['skip'] );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		});
	});
	
	it('skip_on_test_error',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.match(/something/g) ) pCallback('dummey error', null);
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "001_unzip": {
					    command: "gunzip my.zip",
					    test: "something",
					    skip_on_test_failed: true
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function(data) {
			try {
				assert.isFalse( data['exit'] );
				assert.isTrue( data['skip'] );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		});
	});
	
	it('no_skip_on_test_failed',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.match(/something/g) ) pCallback(null, 'stop');
    	}
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "001_unzip": {
					    command: "gunzip my.zip",
					    test: "something",
					    skip_on_test_failed: true
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function(data) {
			try {
				assert.isFalse( data['exit'] );
				assert.isTrue( data['skip'] );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		});
	});
	
	it('no_skip_on_test_error',function(done){
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.match(/something/g) ) pCallback('dummey error', null);
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "001_unzip": {
					    command: "gunzip my.zip",
					    test: "something",
					    skip_on_test_failed: false
					  }
				}
		};
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function(data) {
			try {
				assert.isFalse( data['exit'] );
				assert.isFalse( data['skip'] );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		});
	});
});
