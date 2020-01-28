const fs = require('fs');
const assert = require('chai').assert
const TestedClass = require('../lib/hpcc-ecls');
const load_file = require('./load_file');

describe('hpcc-ecls',function(){
	
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
	
	it('apply_settings_and_config',function(done){
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.include( pCmd, 'server=127.0.0.1');
    		assert.include( pCmd, 'username=foobar');
    		assert.include( pCmd, 'password=foobar');
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oSettings = {
				'*': {
					server: '127.0.0.2'
				}
		};
		var oTested = new TestedClass( null, oSettings );
		
		var oTemplate = {
    			root: {
    				"000_content": {
					    cluster: "thor",
					    content: "something",
					    format: "default",
					    output: "test.txt",
					    server: '127.0.0.1',
						username: 'foobar',
						password: 'foobar'
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
    		assert.include( pCmd, 'server=127.0.0.1');
    		assert.include( pCmd, 'username=foobar');
    		assert.include( pCmd, 'password=foobar');
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oSettings = {
				'*': {
					server: '127.0.0.1',
					username: 'foobar',
					password: 'foobar'
				}
		};
		var oTested = new TestedClass( null, oSettings );
		
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
    	
    	oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
	});
	
	it('errorThrownFromWritingContent', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, "", "");
    	};
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		throw new Error('error');
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "abc": {
					    cluster: "thor",
					    content: "OUTPUT(2018);",
					    output: "/tmp/2018/test.csv"
					  }
				}
		};
    	oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function( pData ) {
			done('Expecting error');
		}, function( pError ) {
			done();
		})
	});
	
	it('errorThrownFromCmdExecutor', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		throw new Error('error');
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "abc": {
					    cluster: "thor",
					    file: "/tmp/my.ecl",
					    output: "/tmp/2018/test.csv"
					  }
				}
		};
    	oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function( pData ) {
			done('Expecting error');
		}, function( pError ) {
			done();
		})
	});
	
	it('tagsMultipleValue', function(done) {
		var oCmdsExecuted = [];
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.notInclude( pCmd, "{{ year }}");
    		oCmdsExecuted.push( pCmd );
    		pCallback( null, "", "");
    	};
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		assert.notInclude( pContent, "{{ year }}");
    		pCallback( null, "", "");
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "summary_{{ years }}": {
					    cluster: "thor",
					    content: "OUTPUT({{ years }});",
					    output: "/tmp/{{ years }}/test.csv"
					  }
				}
		};
    	var oContext = {
    			years: [2018,2019,2020]
    	};
		oTested.handle( 'root', oTemplate['root'], oExecutor, oContext ).then(function( pData ) {
			try {
				assert.equal( Object.keys(pData['hpcc-ecls']).length, oContext.years.length );
				assert.equal( oCmdsExecuted.length, 3 );
				assert.exists( pData['hpcc-ecls']['summary_2018'] );
				assert.exists( pData['hpcc-ecls']['summary_2019'] );
				assert.exists( pData['hpcc-ecls']['summary_2020'] );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		})
	});
	
	it('tags', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.notInclude( pCmd, "{{ year }}");
    		pCallback( null, "", "");
    	};
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		assert.notInclude( pContent, "{{ year }}");
    		pCallback( null, "", "");
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = {
				root: {
					  "summary_{{ year }}": {
					    cluster: "thor",
					    content: "OUTPUT({{ year }});",
					    output: "/tmp/{{ year }}/test.csv"
					  }
				}
		};
    	var oContext = {
    			year: "2018"
    	};
		oTested.handle( 'root', oTemplate['root'], oExecutor, oContext ).then(function( pData ) {
			try {
				assert.property( pData['hpcc-ecls'], 'summary_2018' );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		})
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
    		} else {
    			// the TEMP_ECL_FILE
    			fs.writeFileSync('/tmp/etl-js.ecl', 'something', 'utf8');
    		}
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( './hpcc-ecls/file.yml');
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			done( pError );
		}).finally( function() {
			fs.unlinkSync( '/tmp/etl-js.ecl' );
		})
	});
	
	it('fileWithErrorDownloadingFile',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		if ( pCmd.indexOf('wget') >= 0 ) {
    			pCallback( new Error("Test error"), "", "");
    		}
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( './hpcc-ecls/file.yml');
		
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
    			pCallback( new Error("Test error"), "", "");
    		} else {
    			// the TEMP_ECL_FILE
    			fs.writeFileSync('/tmp/etl-js.ecl', 'something', 'utf8');
    		}
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( './hpcc-ecls/file.yml');
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function() {
			done("Should have raised and caught error.");
		}, function( pError ) {
			done();
		}).finally( function() {
			fs.unlinkSync( '/tmp/etl-js.ecl' );
		});
	});
	
	it('localFile',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		console.log( 'Command=' + pCmd );
    		assert.include( pCmd, "cluster=thor");
    		
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		assert.equal(pContent, 'hello world!');
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
    	fs.writeFileSync('test.ecl', 'hello world!');
    	var oTemplate = {
				root: {
					  "000_local_file": {
					    cluster: "thor",
					    file: "file://./test.ecl"
					  }
				}
		};
    	
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function( pData ) {
			//console.log('#### ecls content: ');
			//console.dir( pData );
			done();
		}, function( pError ) {
			done( pError );
		}).finally( function() {
			fs.unlinkSync('test.ecl');
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
    	
		var oConfig = load_file( './hpcc-ecls/content.yml');
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function( pData ) {
			done();
		}, function( pError ) {
			done( pError );
		})
	});
	
	it('contentWithErrorCreatingFile',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, "", "");
    	}
    	ExecutorClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
    		pCallback( new Error("Test error"), "", "some stderr stuff");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( './hpcc-ecls/content.yml');
		
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
    	
		var oConfig = load_file( './hpcc-ecls/content.yml');
		
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
			done( pError );
		});
	});
});
