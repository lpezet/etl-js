const util = require('util');
const Promises = require('./promises');
const TemplateEngine = require('./templating/engine');
const SimpleLogger = require('./logger');

var logger = new SimpleLogger({ level: 'info' });

var CHAIN_EVAL = function( pValue ) {
	//console.log('#### CHAIN EVAL:');
	//console.log(JSON.stringify( pValue ));
	if ( !pValue['results'] ) throw new Error('Expecting { exit: ..., skip: ..., results: [] } structure.');
	var oResults = pValue['results'];
	for (var i = oResults.length - 1; i >= 0; i--) {
		if (oResults[i]['exit'] || oResults[i]['skip']) return true;
	}
	return false;
}

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
		//console.log('# commands: pPreviousData=');
		//console.log( JSON.stringify( pPreviousData ) );
		// (pPreviousData && pPreviousData.length > 0 && (pPreviousData[ pPreviousData.length - 1 ]['exit'] || pPreviousData[ pPreviousData.length - 1 ]['skip'] ) )
		if ( !pExecutor ) {
			return Promise.resolve( pPreviousData );
		}
		//if ( pPreviousData['exit'] || !pExecutor ) {
		//	return Promise.resolve( pPreviousData );
		//}
		//console.log('commands._exec: PreviousData=');
		//console.dir( pPreviousData );
		//if ( pPreviousData['etl']['exit'] ) {
		//	return Promise.resolve( pPreviousData );
		//} else {
		return new Promise( function( resolve, reject ) {
			// error, stdout, stderr, result
			var asPromised = function( pFunc, pData) {
				logger.debug('[%s] Command [%s] results:\n%j', pParent, pKey, pData);
				//if ( ! pPreviousData.commands[pKey] ) pPreviousData.commands[pKey] = {};
				//pPreviousData.commands[pKey] = data;
				var data = { command: pKey, results: pData, exit: Boolean(pData['exit']), skip: Boolean(pData['skip']) };
				//data[ pKey ] = pData;
				pPreviousData.exit = pPreviousData.exit || Boolean(pData['exit']);
				pPreviousData.skip = pPreviousData.skip || Boolean(pData['skip']);
				pPreviousData.results.push( data );
				pFunc( pPreviousData );
			}
			var oCmdSpecs = pSpecs;
			try {
				logger.debug('[%s] Executing command [%s]...', pParent, pKey);
				var oCwd = oCmdSpecs['cwd'];
				if ( oCwd &&  oCwd.indexOf("{{") >= 0) oCwd = that._evaluate( oCwd, pContext );
				
				var oTest = oCmdSpecs['test'];
				if ( oTest ) oTest = oTest.indexOf("{{") < 0 ? oTest: that._evaluate( oTest, pContext );
				if ( Array.isArray( oTest ) ) oTest = oTest[0]
				var oCmd = oCmdSpecs['command'];
				oCmd = oCmd.indexOf("{{") < 0 ? oCmd: that._evaluate( oCmd, pContext );
				if ( Array.isArray( oCmd ) ) oCmd = oCmd[0];
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
						var data = { error: null, result: null, message: null, exit: false, pass: true, _stdout: null, _stderr: null };
						try {
							logger.debug('[%s] Running command: [%s] with options [%j]', pParent, pCmd, pCmdOptions);
							pExecutor.exec( pCmd, pCmdOptions, function( error, stdout, stderr ) {
								data.error = error;
								data._stdout = stdout;
								data._stderr = stderr;
								try {
									if ( error ) {
										logger.error('[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error);
										//reject( util.format.apply(null, [ '[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error ] ));
										data.result = stderr;
										data.message = util.format.apply(null, [ '[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error ] );
										if ( oCmdSpecs['ignore_errors'] ) {
											resolve( data );
										} else {
											reject( data );
										}
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
										
										if ( oCmdSpecs['var'] ) {
											var oVarKey = pSpecs['var'];
											logger.debug('[%s] Saving result of command [%] to var [%s].', pParent, pKey, oVarKey);
											pContext.vars[ oVarKey ] = data.result;
										}
										
										resolve( data )
									}
								} catch (e) {
									data.error = e;
									if ( oCmdSpecs['ignore_errors'] ) {
										resolve( data );
									} else {
										reject( data );
									}
								}
							});
						} catch (e) {
							logger.error('[%s] Unexpected error executing command: [%s] with options [%s]', pParent, pCmd, pCmdOptions);
							data.error = e;
							if ( oCmdSpecs['ignore_errors'] ) {
								resolve( data );
							} else {
								reject( data );
							}
						}
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
									logger.error('[%s] Test failed for command [%s], exit code = %s, error = %j. Skipping command.', pParent, pKey, error.code, error);
									if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
									func = reject;
								} else {
									if ( ! stdout ) {
										logger.error('[%s] Unexpected test result (stdout=[%s]). Skipping command %s.', pParent, stdout, pKey );
										if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
										func = reject;
									} else {
										if ( stdout.match(/continue/g) ) {
											logger.info('[%s] Test passed for command [%s].', pParent, pKey );
											//resolve();
											data.pass = true;
											func = resolve;
										} else {
											logger.info('[%s] Test failed. Skipping command [%s] (exit_on_test_failed=%s).', pParent, pKey, oCmdSpecs['exit_on_test_failed'] );
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
							func( data );
						});
					});
				}
				
				if ( oTest ) {
					exec_test( oTest )
					.then(function( result ) {
						logger.debug('[%s] After command test...', pParent);
						if ( result['pass'] ) {
							logger.debug('...pass=%s', result['pass'])
							return exec_command( oCmd, oCmdOptions );
						} else {
							return Promise.resolve( result );
						}
					}, function( data ) {
						logger.info('[%s] Error in test. Command [%s] will be skipped.', pParent, pKey);
						//return Promise.reject ( error );
						return Promise.resolve( data ); //{ error: error, pass: false } );
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
					//.catch( function( pError ) {
					//	logger.info('Unexpected error from test.');
					//	//return Promise.reject ( error );
					//	return Promise.resolve( data ); //{ error: error, pass: false } );
					//})
					.then(function( result ) {
						//console.log('##### then() after executing command!!!!!');
						if ( result['pass'] ) {
							logger.info('[%s] ...command [%s] executed.', pParent, pKey );
							//console.dir( result );
						} else {
							logger.debug('[%s] ...command [%s] skipped (test failed).', pParent, pKey );
						}
						asPromised( resolve, result);
					}, function( error ) {
						//TODO: WARNING: Problem is here, we don't know if it's the Promise.reject() from error from test or error from executing the command itself.
						//console.log('##### error() after executing command!!!!!');
						logger.error('[%s] Error while executing command [%s].', pParent, pKey, error );
						var data = { error: error, result: null, message: null, exit: false };
						if ( oCmdSpecs['exit_on_error'] ) data.exit = true;
						if ( oCmdSpecs['ignore_errors'] ) {
							asPromised( resolve, data);
						} else {
							asPromised( reject, data);
						}
						/*
						if ( error['exit'] && ! error[] ) {
							//resolve();
							asPromised( reject, error);
						} else {
							asPromised( resolve, error);
						}
						*/
					});
				} else {
					logger.info('[%s] No test for [%s]...', pParent, pKey);
					exec_command( oCmd, oCmdOptions )
					.then(function( result ) {
						logger.info('[%s] ...command [%s] executed.', pParent, pKey );
						//resolve();
						asPromised( resolve, result);
					}, function( error ) {
						logger.error('[%s] Error while executing command [%s].', pParent, pKey, error );
						//resolve();
						var data = { error: error, result: null, message: null, exit: false };
						if ( oCmdSpecs['exit_on_error'] ) data.exit = true;
						if ( oCmdSpecs['ignore_errors'] ) {
							asPromised( resolve, data);
						} else {
							asPromised( reject, data);
						}
					});
				}
				
			} catch ( e ) {
				logger.error('[%s] Unexpected error executing command %s.', pParent, pKey);
				//reject( e );
				var data = { error: e, stdout: null, stderr: null, result: null, exit: false  };
				if ( oCmdSpecs['exit_on_error'] ) data.exit = true;
				//if ( oCmdSpecs['ignore_errors'] ) {
				//	asPromised( resolve, data);
				//} else {
				asPromised( reject, data);
				//}
				//asPromised( reject, ); //TODO: check for "exit"....
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

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pContext ) { //pCurrentActivityResult, pGlobalResult, pContext ) {
	//var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
	//var oPromise = new Promise();
	//console.log('commands.handle: data = ');
	//console.dir( pData );
	var that = this;
	//console.log('## Commands.handle()....');
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] Processing commands...', pParent);
		try {
			//var oResults = []; // Should be maybe: { exit: false, skip: false, results: [] } //{ 'commands' : [] };
			var oResult = { exit: false, skip: false, results: [] };
			var oPromises = [];
			for (var i in pConfig) {
				//console.log('## Command found: ' + i);
				oPromises.push( that._exec( pParent, i, pConfig[i], pExecutor, pContext ));
			}
			
			//PromiseSeqConcatResults
			//Promises.seqConcatResults( oPromises ).then(function( pData ) {
			//Promises.seq( oPromises, oResults )
			Promises.chain( oPromises, oResult, CHAIN_EVAL, { name: "commands", logger: logger } )
			.then(function( data ) {
				logger.info('[%s] Done processing commands.', pParent);
				logger.info('[%s] Results:\n%j', pParent, data);
				//console.log('commands.handle(): data = %j', data);
				//console.dir( data );
				resolve( oResult );
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
