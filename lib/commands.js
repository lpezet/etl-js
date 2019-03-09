const util = require('util');
const Promises = require('./promises');
const TemplateEngine = require('./templating/engine');
const SimpleLogger = require('./logger');

var logger = new SimpleLogger({ level: 'info' });

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'commands', this, function( pSettings, pLogger ) {
		that.mSettings = pSettings;
		if ( pLogger ) logger = pLogger;
	});
	this.mTemplateEngine = new TemplateEngine();
};

ModClass.prototype._evaluate = function( pTemplate, pContext ) {
	//TODO: Not sure I want to do this. This would make "files" handling "context" that might be different than other mods.
	//For example, "files" might accept $._current and others may not. Best if using path in template is the same across everything.
	// Having said that, a mod then cannot access the results of another mod within the same activity...
	
	/*
	var oContext = JSON.parse(JSON.stringify(pContext.global));
	oContext['_current'] = JSON.parse(JSON.stringify(pContext.local));
	console.log('Merged context=');
	console.dir( oContext );
	var oResult = this.mTemplateEngine.evaluate( pTemplate, oContext );
	console.log('Result=');
	console.dir( oResult );
	*/
	return this.mTemplateEngine.evaluate( pTemplate, pContext);//pContext.global );
};

ModClass.prototype._exec = function( pParent, pKey, pSpecs, pExecutor, pContext ) {
	var that = this;
	return function( pPreviousData ) {
		if ( pPreviousData['_exit'] ) {
			return Promise.resolve( pPreviousData );
		}
		//console.log('commands._exec: PreviousData=');
		//console.dir( pPreviousData );
		//if ( pPreviousData['etl']['exit'] ) {
		//	return Promise.resolve( pPreviousData );
		//} else {
			return new Promise( function( resolve, reject ) {
				// error, stdout, stderr, result
				var asPromised = function( func, data) {
					if ( ! pPreviousData.commands[pKey] ) pPreviousData.commands[pKey] = {};
					pPreviousData.commands[pKey] = data;
					if ( data['exit'] ) {
						pPreviousData['_exit'] = data['exit'];
						pPreviousData['_exit_from'] = pKey;
					}
					/*
					if ( result ) {
						pPreviousData[pKey]['result'] = result;
					}
					if ( error ) {
						pPreviousData[pKey]['error'] = error;
					}
					*/
					//console.log('asPromised:');
					//console.dir( pPreviousData );
					func( pPreviousData );
				}
				try {
					logger.debug('[%s] Executing command [%s]...', pParent, pKey);
					var oCmdSpecs = pSpecs;
					var oCwd = oCmdSpecs['cwd'];
					var oTest = oCmdSpecs['test'];
					var oCmd = oCmdSpecs['command'];
					var oCmd = oCmd.indexOf("{{") < 0 ? oCmd: that._evaluate( oCmd, pContext );
					
					var oEnv = oCmdSpecs['env'];
					
					
					var oCmdOptions = {};
					oCmdOptions['context'] = pKey;
					
					if ( oCwd ) oCmdOptions['cwd'] = oCwd;
					if ( oEnv ) {
						oCmdOptions['env'] = {};
						for (var k in oEnv ) {
							oCmdOptions['env'][k] = oEnv[k];
						}
					}
					
					var exec_command = function( pCmd, pCmdOptions ) {
						return new Promise(function( resolve, reject ) {
							logger.debug('[%s] Running command...', pParent);
							pExecutor.exec( pCmd, pCmdOptions, function( error, stdout, stderr ) {
								var data = { error: error, result: null, message: null, exit: false, pass: true, _stdout: stdout, _stderr: stderr };
								try {
									if ( error ) {
										logger.error('[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error);
										//reject( util.format.apply(null, [ '[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error ] ));
										data.result = stderr;
										data.message = util.format.apply(null, [ '[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error ] );
										reject( data );
									} else {
										logger.debug('[%s] Command [%s] completed.', pParent, pKey);
										//resolve( stdout );
										data.result = stdout;
										if ( oCmdSpecs['result_as_json'] === true ) {
											try {
												data.result = JSON.parse( stdout );
											} catch(e) {
												logger.warn('[%s] Error with command [%s]. Could not parse stdout as JSON: [%s] not a valid JSON string.', pParent, pKey, stdout);
											}
										}
										resolve( data )
									}
								} catch (e) {
									data.error = e;
									reject( data );
								}
							});
						});
					}
					
					var exec_test = function( pTest ) {
						logger.info('[%s] Test for command [%s]...', pParent, pKey);
						var oTest = '(' + pTest + ') && echo "continue" || echo "stop"';
						return new Promise(function( resolve, reject ) {
							pExecutor.exec( oTest, { context: pKey }, function( error, stdout, stderr ) {
								var data = { error: error, result: null, message: null, exit: false, pass: false, _stdout: stdout, _stderr: stderr };
								var func = null;
								try {
									//console.log('###### Done executing test command...');
									if ( error ) {
										logger.error('[%s] Test failed for command [%s], exit code = %s, error = %s. Skipping command.', pParent, pKey, error.code, error);
										//reject( error );
										//var oData = { error: error, exit: false, context: pParent + '..' + pKey };
										if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
										//reject( data )
										func = reject;
									} else {
										if ( ! stdout ) {
											logger.error('[%s] Unexpected test result (stdout=[%s]). Skipping command %s.', pParent, stdout, pKey );
											//reject( stdout );
											//var oData = { error: error, exit: false, context: pParent + '..' + pKey };
											if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
											//reject( oData )
											func = reject;
										} else {
											if ( stdout.match(/continue/g) ) {
												logger.info('[%s] Test passed for command [%s].', pParent, pKey );
												//resolve();
												data.pass = true;
												func = resolve;
											} else {
												logger.info('[%s] Test failed. Skipping command [%s].', pParent, pKey );
												logger.debug('[%s] Test output for command [%s]: [%s]', pParent, pKey, stdout );
												//reject( stdout );
												//var oData = { error: error, exit: false, context: pParent + '..' + pKey };
												if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
												data.pass = false;
												//reject( oData )
												func = resolve;
											}
										}
									}
								} catch(e) {
									data.error = e;
									func = reject;
								}
								//console.log('######  Done with test command logic.');
								//console.dir( data );
								//console.log('######  Done priting data.');
								
								func( data );
							});
						});
					}
					
					if ( oTest ) {
						exec_test( oTest )
						.then(function( result ) {
							//console.log('##### then() after test...');
							if ( result['pass'] ) {
								return exec_command( oCmd, oCmdOptions );
							} else {
								return Promise.resolve( result );
							}
						}, function( error ) {
							//console.log('##### error() after test...');
							
							return Promise.reject ( error );
							/*
							console.log('##### Error from running test command !!!!');
							if ( error['exit'] ) {
								console.log('##### After returning from test error, exiting.');
								asPromised( reject, error);
							} else {
								// continue for other commands
								console.log('##### After returning from test error, NOT exiting.');
								asPromised( resolve, error);
							}
							*/
						})
						.then(function( result ) {
							//console.log('##### then() after executing command!!!!!');
							if ( result['pass'] ) {
								logger.info('[%s] Command [%s] executed.', pParent, pKey );
								//console.dir( result );
							} else {
								logger.debug('[%s] Command [%s] skipped (test failed).', pParent, pKey );
							}
							asPromised( resolve, result);
						}, function( error ) {
							//TODO: WARNING: Problem is here, we don't know if it's the Promise.reject() from error from test or error from executing the command itself.
							
							//console.log('##### error() after executing command!!!!!');
							logger.error('[%s] Error while executing command [%s].', pParent, pKey, error );
							if ( error['exit'] ) {
								//resolve();
								asPromised( reject, error);
							} else {
								asPromised( resolve, error);
							}
						});
					} else {
						logger.info('[%s] No test for [%s]...', pParent, pKey);
						exec_command( oCmd, oCmdOptions )
						.then(function( result ) {
							logger.info('[%s] Command [%s] executed.', pParent, pKey );
							//resolve();
							asPromised( resolve, result);
						}, function( error ) {
							logger.error('[%s] Error while executing command [%s].', pParent, pKey, error );
							//resolve();
							asPromised( resolve, error);
						});
					}
					
				} catch ( e ) {
					logger.error('[%s] Unexpected error executing command %s.', pParent, pKey);
					//reject( e );
					asPromised( reject, { error: e, stdout: null, stderr: null, result: null, exit: false  }); //TODO: check for "exit"....
				}
			});
		//}
	}
}
/*
// NB: No starting value
const PromiseSeqConcatResults = (funcs)  =>
funcs.reduce((promise, func) =>
  promise.then(result => func().then(Array.prototype.concat.bind(result))),
  Promise.resolve([]))

const PromiseSeq = (funcs, startingValue) =>
funcs.reduce((promise, func) =>
  promise.then(result => func(result)),
  Promise.resolve(startingValue))
*/

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pCurrentActivityResult, pGlobalResult, pContext ) {
	var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
	//var oPromise = new Promise();
	//console.log('commands.handle: data = ');
	//console.dir( pData );
	var that = this;
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] Processing commands...', pParent);
		try {
			var oData = { 'commands' : {} };
			var oPromises = [];
			for (var i in pConfig) {
				oPromises.push( that._exec( pParent, i, pConfig[i], pExecutor, oTemplateContext ));
			}
			
			//PromiseSeqConcatResults
			//Promises.seqConcatResults( oPromises ).then(function( pData ) {
			Promises.seq( oPromises, oData ).then(function( data ) {
				logger.debug('[%s] Done processing commands.', pParent);
				//console.log('Data=');
				//console.dir( data );
				resolve( oData );
			}, function( error ) {
				logger.error('[%s] Unexpected error running commands.', pParent, error);
				reject( error );
			});
		} catch (e) {
			logger.error('[%s] Unexpected error processing commands.', pParent, e);
			reject( e );
		}
	});
}

exports = module.exports = ModClass;
