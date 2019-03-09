const ETLClass = require('../lib/etl');
const CommandsClass = require('../lib/commands');
const assert = require('chai').assert;

describe('etl-commands',function(){
	
	var ExecutorClass = function() {};
	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
		//console.log('pCmd=' + pCmd);
		if ( pCmd.startsWith("(error)") ) {
			// Passing a value for error (first arg)
			pCallback( "!!error!!", null, "failed stderr" );
		} else if ( pCmd.startsWith("(stop)") ) {
			pCallback( null, "stop", null );
		} else if ( pCmd.startsWith("(continue)") ) {
			pCallback( null, "continue", null );
		} else {
			pCallback( null, pCmd, null );
		}
	}
	
	
	var mETLTemplate = null;
	
	beforeEach(function(done) {
		mETLTemplate = {
			etl: [ 'step1', 'step2' ],
			step1: {
				commands: {
					"t001test": {
						command: "test me",
						//test: "fail",
						exit_on_test_failed: true
					},
					"t002test": {
						command: "test me2",
						//test: "fail",
						exit_on_test_failed: true
					}
				}
			},
			step2: {
				commands: {
					"abouttofail1": {
						command: "dont test me"
					},
					"gonnafail1": {
						command: "gonna fail",
						test: "error",
						exit_on_test_failed: true
					},
					"shouldnotgethere": {
						command: "nope"
					}
				}
			},
			step3: {
				commands: {
					"someothercommand": {
						command: "hello"
					}
				}
			}
		};
		done();
	});
	
	afterEach(function(done) {
		done();
	});
	
	it('errorWithExitMultipleActivitiesAndCommands', function(done) {
    	var oSettings = {};
    	var oETL = new ETLClass( new ExecutorClass(), oSettings );
    	new CommandsClass( oETL );
		
		oETL.process( mETLTemplate ).then(function( pData ) {
			done( 'Should have failed with error.');
		}, function( pError ) {
			done();
		});
	});
	
	
	it('errorWithExitSingleActivityAndCommand', function(done) {
		var oETLConfigLite = {
			etl: [ 'step1' ],
			step1: {
				commands: {
					"t001test": {
						command: "test me",
						test: "error",
						exit_on_test_failed: true
					}
				}
			}
    	};
		
		var oSettings = {};
    	var oETL = new ETLClass( new ExecutorClass(), oSettings );
    	new CommandsClass( oETL );
		
    	oETL.process( oETLConfigLite ).then(function( pData ) {
			done( 'Should have failed with error.');
		}, function( pError ) {
			done();
		});
	});
	
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
    	//console.log(util.inspect(mETLTemplate, false, null, true /* enable colors */))
		
    	oETL.process( mETLTemplate ).then(function( pData ) {
    		console.dir( pData );
    		//console.log('End result: (pData)');
    		//console.log(util.inspect(pData, false, null, true /* enable colors */))
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
		
});
