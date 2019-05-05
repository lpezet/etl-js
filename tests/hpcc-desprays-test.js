const assert = require('chai').assert
const load_file = require('./load_file');
const TestedClass = require('../lib/hpcc-desprays');

describe('hpcc-desprays',function(){
	
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
	
	it('tagsInLogicalAndDestinationPath', function(done) {
		var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		pCallback( null, pCmd, "" );
    	};
    	var oTemplate = {
    		root: {
    		    "noaa::ghcn::daily::{{ year }}::raw": {
    		    	destinationIP: "192.168.0.10",
    		        destinationPath: "/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/{{ year }}.csv"
    		    }
    		}
    	};
    	var oContext = {
    			year: "2018"
    	};
    	var oExecutor = new ExecutorClass();
		var oTested = new TestedClass( null, {} );
		oTested.handle( 'root', oTemplate['root'], oExecutor, {}, oContext).then(function( pData ) {
			//console.dir( pData );
			try {
				assert.property( pData['hpcc-desprays'],  "noaa::ghcn::daily::2018::raw" );
				assert.include( pData['hpcc-desprays']['noaa::ghcn::daily::2018::raw']['result'], "dstfile=/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/2018.csv");
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
    					destinationXML: "my.xml"
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
    					destinationXML: "my.xml"
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
    					destinationXML: "my.xml",
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
    					destinationXML: "my.xml"
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

	it('missingRequired',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		
    	};
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass( null, { '*': { server: '1.2.3.4' }});
    	
    	var oTemplate = {
				root: {
				    "noaa::ghcn::daily::2018::raw": {
				    	useless: true
				    }
				}
		};
    	
		oTested.handle( 'root' , oTemplate['root'], oExecutor ).then(function() {
			done("Expected error due to missing format information in template.");
		}, function( pError ) {
			done();
		})
    	
	});

	it('basic',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		//console.log('cmd=' + pCmd );
    		assert.include( pCmd, "action=despray");
    		assert.include( pCmd, "server=1.2.3.4");
    		assert.include( pCmd, "dstfile=/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/2018.csv");
    		assert.include( pCmd, "dstip=192.168.0.10");
    		assert.include( pCmd, "srcname=noaa::ghcn::daily::2018::raw");
    		assert.include( pCmd, "nowait=1");
    		assert.include( pCmd, "server=");
    		assert.include( pCmd, "connect=1");
    		assert.include( pCmd, "overwrite=0");
    		assert.include( pCmd, "replicate=0");
    		assert.include( pCmd, "compress=0");
    		assert.include( pCmd, "username=foo");
    		assert.include( pCmd, "password=bar");
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass( null, { '*': { server: '1.2.3.4', username: 'foo', password: 'bar' }});
    	
		var oTemplate = load_file( "./hpcc-desprays/basic.yml" );
		
		oTested.handle( 'root' , oTemplate['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
	
});
