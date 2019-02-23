const ETLClass = require('../lib/etl');
const FilesClass = require('../lib/files');
const CollectClass = require('./etl/collect');

const load_file = require('./load_file');
const assert = require('chai').assert;
const sinon = require('sinon');
const winston = require('winston');

const util = require('util');

describe('etl-files',function(){
	
	var mETLTemplate = null;
	
	beforeEach(function(done) {
		mETLTemplate = {
			etl: [ 'step1', 'step2', 'step3'],
			step1: {
				collects: {
					"t001test": {
						result: "toto"
					},
					"t002test": {
						result: [ "toto", "titi" ]
					}
				}
			},
			step2: {
				collects: {
					"singleResult1": {
						result: "toto"
					},
					"singleResult2": {
						result: "titi"
					}
				}
			},
			step3: {
				files: {
					"/tmp/toto.txt": {
						source: "https://a.b.c/toto.txt"
					}
				}
			}
		};
		done();
	});
	
	afterEach(function(done) {
		done();
	});
	
	it('sanityTest', function(done) {
		var ExecutorClass = function() {};
		ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
			pCallback( null, pCmd, null );
		}
		
    	var oSettings = {};
    	var oETL = new ETLClass( new ExecutorClass(), oSettings );
    	new FilesClass( oETL );
		new CollectClass( oETL );
		
		oETL.process( mETLTemplate ).then(function( pData ) {
			//console.log('pData=');
			//console.dir(pData);
			done();
		}, function( pError ) {
			done();
		});
	});
	
	it('filesSourceTemplate', function(done) {
		var ExecutorClass = function() {};
		ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
			assert.include( pCmd, "http://a.b.c/toto.txt" );
			pCallback( null, pCmd, null );
		}
		mETLTemplate['step3'] = {
				files: {
					"/tmp/toto.txt": {
						source: "http://a.b.c/{{ $.step1.collects.t001test.result }}.txt"
					}
				}
		};
		var oSettings = {};
    	var oETL = new ETLClass( new ExecutorClass(), oSettings );
    	new FilesClass( oETL );
		new CollectClass( oETL );
		
    	oETL.process( mETLTemplate ).then(function( pData ) {
    		//console.dir( pData );
			done();
		}, function( pError ) {
			done();
		});
	});
	
	it('filesTargetTemplate', function(done) {
		var ExecutorClass = function() {};
		ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
			assert.include( pCmd, "/tmp/toto.txt" );
			pCallback( null, pCmd, null );
		}
		mETLTemplate['step3'] = {
				files: {
					"/tmp/{{ $.step1.collects.t001test.result }}.txt": {
						source: "http://a.b.c/titi.txt"
					}
				}
		};
		var oSettings = {};
    	var oETL = new ETLClass( new ExecutorClass(), oSettings );
    	new FilesClass( oETL );
		new CollectClass( oETL );
		
    	oETL.process( mETLTemplate ).then(function( pData ) {
    		//console.dir( pData );
			done();
		}, function( pError ) {
			done();
		});
	});
	
	it('filesTargetAndSourceTemplate', function(done) {
		var ExecutorClass = function() {};
		ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
			assert.include( pCmd, "/tmp/toto.txt" );
			assert.include( pCmd, "http://a.b.c/toto.txt" );
			pCallback( null, pCmd, null );
		}
		mETLTemplate['step3'] = {
				files: {
					"/tmp/{{ $.step1.collects.t001test.result }}.txt": {
						source: "http://a.b.c/{{ $.step1.collects.t001test.result }}.txt"
					}
				}
		};
		var oSettings = {};
    	var oETL = new ETLClass( new ExecutorClass(), oSettings );
    	new FilesClass( oETL );
		new CollectClass( oETL );
		
    	oETL.process( mETLTemplate ).then(function( pData ) {
    		//console.dir( pData );
			done();
		}, function( pError ) {
			done();
		});
	});
	
	it('filesTargetAndSourceMultiValueTemplate', function(done) {
		var ExecutorClass = function() {};
		ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
			if ( pCmd.indexOf("/tmp/toto.txt") >= 0 ) {
				assert.include( pCmd, "http://a.b.c/toto.txt" );
			} else if ( pCmd.indexOf("/tmp/titi.txt") >= 0 ) {
				assert.include( pCmd, "http://a.b.c/titi.txt" );
			} else {
				throw new Error("Unexpected command: " + pCmd);
			}
			pCallback( null, pCmd, null );
		}
		mETLTemplate['step3'] = {
				files: {
					"/tmp/{{ $.step1.collects.t002test.result }}.txt": {
						source: "http://a.b.c/{{ $.step1.collects.t002test.result }}.txt"
					}
				}
		};
		var oSettings = {};
    	var oETL = new ETLClass( new ExecutorClass(), oSettings );
    	new FilesClass( oETL );
		new CollectClass( oETL );
		
    	oETL.process( mETLTemplate ).then(function( pData ) {
    		//console.dir( pData );
			done();
		}, function( pError ) {
			done();
		});
	});
	/*
	it('errorNoExitMultipleActivitiesAndCommands', function(done) {
		var oSettings = {};
    	var oETL = new ETLClass( new ExecutorClass(), oSettings );
    	new CommandsClass( oETL );
		
    	mETLTemplate.step2.commands.gonnafail1.exit_on_test_failed = false;
		oETL.process( mETLTemplate ).then(function( pData ) {
			done();
		}, function( pError ) {
			done( pError );
		});
	});
	
	it('stopWithExitMultipleActivitiesAndCommands', function(done) {
		var oSettings = {};
    	var oETL = new ETLClass( new ExecutorClass(), oSettings );
    	new CommandsClass( oETL );
		
    	mETLTemplate.step2.commands.gonnafail1.test = "stop";
    	mETLTemplate.etl.push('step3');
    	//console.log(util.inspect(mETLTemplate, false, null, true ))
		
    	oETL.process( mETLTemplate ).then(function( pData ) {
    		//console.dir( pData );
    		//console.log('End result: (pData)');
    		//console.log(util.inspect(pData, false, null, true ))
			//done( 'Should have exited with error (?)');
    		assert.notExists( pData.step2.commands['shouldnotgethere'] );
    		assert.notExists( pData['step3'] );
    		done();
		}, function( pError ) {
			done( pError );
		});
	});
	
	it('stopNoExitMultipleActivitiesAndCommands', function(done) {
		var oSettings = {};
    	var oETL = new ETLClass( new ExecutorClass(), oSettings );
    	new CommandsClass( oETL );
		
    	mETLTemplate.step2.commands.gonnafail1.test = "stop";
    	mETLTemplate.step2.commands.gonnafail1.exit_on_test_failed = false;
		oETL.process( mETLTemplate ).then(function( pData ) {
			done();
		}, function( pError ) {
			done( pError );
		});
	});
	*/
		
});