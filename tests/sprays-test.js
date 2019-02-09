const assert = require('chai').assert
const sinon = require('sinon');
const load_file = require('./load_file');
const TestedClass = require('../lib/sprays');

describe('sprays',function(){
	
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});

	it('delimited',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		//console.log('cmd=' + pCmd );
    		assert.include( pCmd, "action=spray");
    		assert.include( pCmd, "server=1.2.3.4");
    		assert.include( pCmd, "srcfile=/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/2018.csv");
    		assert.include( pCmd, "format=csv");
    		assert.include( pCmd, "maxrecordsize=4096");
    		assert.include( pCmd, "srccsvseparator=\\,");
    		assert.include( pCmd, "srccsvterminator=\\n,\\r\\n");
    		assert.include( pCmd, "quote=\\\"");
    		assert.include( pCmd, "dstcluster=mythor");
    		assert.include( pCmd, "dstname=noaa::ghcn::daily::2018::raw");
    		assert.include( pCmd, "nowait=0");
    		assert.include( pCmd, "server=");
    		assert.include( pCmd, "connect=1");
    		assert.include( pCmd, "overwrite=0");
    		assert.include( pCmd, "replicate=0");
    		assert.include( pCmd, "compress=0");
    		assert.include( pCmd, "escape=");
    		assert.include( pCmd, "failifnosourcefile=0");
    		assert.include( pCmd, "recordstructurepresent=0");
    		assert.include( pCmd, "quotedTerminator=0");
    		assert.include( pCmd, "encoding=ascii");
    		assert.include( pCmd, "expiredays=-1");
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass( null, { '*': { server: '1.2.3.4' }});
    	
		var oConfig = load_file( "./sprays/delimited.yml" );
		
		oTested.handle( 'root' , oConfig['root'], oExecutor ).then(function() {
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