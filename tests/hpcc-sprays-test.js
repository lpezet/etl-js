const assert = require('chai').assert
const load_file = require('./load_file');
const TestedClass = require('../lib/hpcc-sprays');

describe('hpcc-sprays',function(){
	
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
    		pCallback( null, pCmd, "" );
    	};
    	var oTemplate = {
    		root: {
    		    "noaa::ghcn::daily::{{ years }}::raw": {
    		        format: "csv",
    		        sourceIP: "192.168.0.10",
    		        sourcePath: "/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/{{ years }}.csv"
    		    }
    		}
    	};
    	var oContext = {
    			years: [2018,2019,2020]
    	};
    	var oExecutor = new ExecutorClass();
		var oTested = new TestedClass( null, {} );
		oTested.handle( 'root', oTemplate['root'], oExecutor, oContext).then(function( pData ) {
			console.dir( pData );
			try {
				assert.property( pData['hpcc-sprays'],  "noaa::ghcn::daily::2018::raw" );
				assert.property( pData['hpcc-sprays'],  "noaa::ghcn::daily::2019::raw" );
				assert.property( pData['hpcc-sprays'],  "noaa::ghcn::daily::2020::raw" );
				assert.include( pData['hpcc-sprays']['noaa::ghcn::daily::2018::raw']['result'], "srcfile=/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/2018.csv");
				assert.include( pData['hpcc-sprays']['noaa::ghcn::daily::2019::raw']['result'], "srcfile=/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/2019.csv");
				assert.include( pData['hpcc-sprays']['noaa::ghcn::daily::2020::raw']['result'], "srcfile=/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/2020.csv");
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		})
	})
	
	
	it('tagsInTargetAndSourcePath', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, pCmd, "" );
    	};
    	var oTemplate = {
    		root: {
    		    "noaa::ghcn::daily::{{ year }}::raw": {
    		        format: "csv",
    		        sourceIP: "192.168.0.10",
    		        sourcePath: "/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/{{ year }}.csv"
    		    }
    		}
    	};
    	var oContext = {
    			year: "2018"
    	};
    	var oExecutor = new ExecutorClass();
		var oTested = new TestedClass( null, {} );
		oTested.handle( 'root', oTemplate['root'], oExecutor, oContext).then(function( pData ) {
			console.dir( pData );
			try {
				assert.property( pData['hpcc-sprays'],  "noaa::ghcn::daily::2018::raw" );
				assert.include( pData['hpcc-sprays']['noaa::ghcn::daily::2018::raw']['result'], "srcfile=/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/2018.csv");
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		})
	})
	
	it('executorThrowingError', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		throw new Error("error");
    	};
    	var oTemplate = {
    			root: {
    				"something": {
    					format: "csv"
    				}
    			}
    	};
    	var oExecutor = new ExecutorClass();
		var oTested = new TestedClass( null, {} );
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done('Expecting error.');
		}, function( pError ) {
			done();
		})
	});
	
	it('error', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( new Error("error"), "", "some stderr stuff");
    	};
    	var oTemplate = {
    			root: {
    				"something": {
    					format: "csv"
    				}
    			}
    	};
    	var oExecutor = new ExecutorClass();
		var oTested = new TestedClass( null, {} );
		oTested.handle( 'root', oTemplate['root'], oExecutor ).then(function() {
			done('Expecting error.');
		}, function( pError ) {
			done();
		})
	});
	
	it('safe_parse_int', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.include( pCmd, 'nowait=0');
    		pCallback( null, "", "");
    	};
    	var oTemplate = {
    			root: {
    				"something": {
    					format: "csv",
    			        timeout: "abcd"
    				}
    			}
    	};
    	var oExecutor = new ExecutorClass();
		var oTested = new TestedClass( null, {} );
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
    				"something": {
    					format: "csv",
    			        sourcePath: "/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/2018.csv"
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
	
	it('xml',function(done){
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {	
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = load_file( "./hpcc-sprays/xml.yml" );
		
		oTested.handle( 'root' , oTemplate['root'], oExecutor ).then(function() {
			done("Update test (xml spray not supported before).");
		}, function( pError ) {
			done();
		})
	});
	
	it('fixed',function(done){
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {	
    	};
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	var oTemplate = load_file( "./hpcc-sprays/fixed.yml" );
		
		oTested.handle( 'root' , oTemplate['root'], oExecutor ).then(function() {
			done("Update test (f spray not supported before).");
		}, function( pError ) {
			done();
		})
	});

	it('missingFormat',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		
    	};
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass( null, { '*': { server: '1.2.3.4' }});
    	
    	var oTemplate = {
				root: {
				    "noaa::ghcn::daily::2018::raw": {
				    	sourceIP: "192.168.0.10"
				    }
				}
		};
    	
		oTested.handle( 'root' , oTemplate['root'], oExecutor ).then(function() {
			done("Expected error due to missing format information in template.");
		}, function( pError ) {
			done();
		})
    	
	});
	
	it('invalidFormat',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		
    	};
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass( null, { '*': { server: '1.2.3.4' }});
    	
    	var oTemplate = {
				root: {
				    "noaa::ghcn::daily::2018::raw": {
				    	sourceIP: "192.168.0.10",
				    	format: "concrete"
				    }
				}
		};
    	
		oTested.handle( 'root' , oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			done( pError );
		})
    	
	});

	it('delimited',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		//console.log('cmd=' + pCmd );
    		assert.include( pCmd, "action=spray");
    		assert.include( pCmd, "server=1.2.3.4");
    		assert.include( pCmd, "srcfile=/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/2018.csv");
    		assert.include( pCmd, "format=csv");
    		assert.include( pCmd, "srcip=192.168.0.10");
    		assert.include( pCmd, "maxrecordsize=4096");
    		assert.include( pCmd, "srccsvseparator=\\,");
    		assert.include( pCmd, "srccsvterminator=\\n,\\r\\n");
    		assert.include( pCmd, "quote=\\\"");
    		assert.include( pCmd, "dstcluster=mythor");
    		assert.include( pCmd, "dstname=noaa::ghcn::daily::2018::raw");
    		assert.include( pCmd, "nowait=1");
    		assert.include( pCmd, "server=");
    		assert.include( pCmd, "connect=1");
    		assert.include( pCmd, "overwrite=0");
    		assert.include( pCmd, "replicate=0");
    		assert.include( pCmd, "compress=0");
    		assert.include( pCmd, "username=foo");
    		assert.include( pCmd, "password=bar");
    		assert.include( pCmd, "escape=");
    		assert.include( pCmd, "failifnosourcefile=0");
    		assert.include( pCmd, "recordstructurepresent=0");
    		assert.include( pCmd, "quotedTerminator=0");
    		assert.include( pCmd, "encoding=ascii");
    		assert.include( pCmd, "expiredays=-1");
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass( null, { '*': { server: '1.2.3.4', username: 'foo', password: 'bar' }});
    	
		var oTemplate = load_file( "./hpcc-sprays/delimited.yml" );
		
		oTested.handle( 'root' , oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
	/*
	it('fixed',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( "./sprays/fixed.yaml" );
		
		oTested.handle( 'root' , oConfig['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
	
	it('xml',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( "./sprays/xml.yaml" );
		
		oTested.handle( 'root' , oConfig['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
	*/
});
