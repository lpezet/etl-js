const util = require('util');
const Promises = require('./promises');
const TemplateEngine = require('./templating/engine');
const SimpleLogger = require('./logger');

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

ModClass = function( pETL, pSettings, pLogger ) {
	this.mLogger = pLogger || new SimpleLogger({ level: 'info' });
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'commands', this, function( pSettings, pLogger ) {
		that.mSettings = pSettings;
		if ( pLogger ) that.mLogger = pLogger;
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

ModClass.prototype._evaluateObject = function( pTemplate, pContext ) {
	return this.mTemplateEngine.evaluateObject( pTemplate, pContext);//pContext.global );
};

ModClass.prototype._single_exec = function( pParent, pKey, pSpecs, pExecutor, pContext, pTemplateIndex ) {
	var that = this;
	return function( pPreviousData ) {
		return new Promise( function( resolve, reject ) {
			// error, stdout, stderr, result
			var asPromised = function( pFunc, pData) {
				that.mLogger.debug('[%s] Command [%s] results:\n%j', pParent, pKey, pData);
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
				that.mLogger.debug('[%s] Executing command [%s]...', pParent, pKey);
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
							that.mLogger.debug('[%s] Running command: [%s] with options [%j]', pParent, pCmd, pCmdOptions);
							pExecutor.exec( pCmd, pCmdOptions, function( error, stdout, stderr ) {
								data.error = error;
								data._stdout = stdout;
								data._stderr = stderr;
								try {
									if ( error ) {
										that.mLogger.error('[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error);
										//reject( util.format.apply(null, [ '[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error ] ));
										data.result = stderr;
										data.message = util.format.apply(null, [ '[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error ] );
										if ( oCmdSpecs['ignore_errors'] ) {
											resolve( data );
										} else {
											reject( data );
										}
									} else {
										that.mLogger.debug('[%s] Command [%s] completed.', pParent, pKey);
										//resolve( stdout );
										data.result = stdout;
										if ( oCmdSpecs['result_as_json'] === true ) {
											try {
												data.result = JSON.parse( stdout );
											} catch(e) {
												that.mLogger.warn('[%s] Error with command [%s]. Could not parse stdout as JSON: [%s] not a valid JSON string.', pParent, pKey, stdout);
											}
										}
										
										if ( oCmdSpecs['var'] ) {
											var oVarKey = pSpecs['var'];
											that.mLogger.debug('[%s] Saving result of command [%] to var [%s].', pParent, pKey, oVarKey);
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
							that.mLogger.error('[%s] Unexpected error executing command: [%s] with options [%s]', pParent, pCmd, pCmdOptions);
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
					that.mLogger.info('[%s] Testing for command [%s]...', pParent, pKey);
					var oTest = '(' + pTest + ') && echo "continue" || echo "stop"';
					return new Promise(function( resolve, reject ) {
						const data = { error: null, result: null, message: null, exit: false, skip: false, pass: false, _stdout: null, _stderr: null };
						pExecutor.exec( oTest, { context: pKey }, function( error, stdout, stderr ) {
							data.error = error;
							data._stdout = stdout;
							data._stderr = stderr;
							var func = null;
							try {
								if ( error ) {
									that.mLogger.error('[%s] Test failed for command [%s], exit code = %s, error = %j. Skipping command.', pParent, pKey, error.code, error);
									if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
									if ( oCmdSpecs['skip_on_test_failed'] ) data.skip = true;
									func = reject;
								} else {
									if ( ! stdout ) {
										that.mLogger.error('[%s] Unexpected test result (stdout=[%s]). Skipping command %s.', pParent, stdout, pKey );
										if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
										if ( oCmdSpecs['skip_on_test_failed'] ) data.skip = true;
										func = reject;
									} else {
										if ( stdout.match(/continue/g) ) {
											that.mLogger.info('[%s] Test passed for command [%s].', pParent, pKey );
											//resolve();
											data.pass = true;
											func = resolve;
										} else {
											that.mLogger.info('[%s] Test failed. Skipping command [%s] (exit_on_test_failed=%s).', pParent, pKey, oCmdSpecs['exit_on_test_failed'] );
											that.mLogger.debug('[%s] Test output for command [%s]: [%s]', pParent, pKey, stdout );
											//reject( stdout );
											//var oData = { error: error, exit: false, context: pParent + '..' + pKey };
											if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
											if ( oCmdSpecs['skip_on_test_failed'] ) data.skip = true;
											data.pass = false;
											//reject( oData )
											func = resolve;
										}
									}
								}
							} catch(e) {
								data.error = e;
								if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
								if ( oCmdSpecs['skip_on_test_failed'] ) data.skip = true;
								data.pass = false;
								func = reject;
								//func = resolve;
							}
							func( data );
						});
					});
				}
				
				if ( oTest ) {
					exec_test( oTest )
					.then(function( result ) {
						that.mLogger.debug('[%s] After command test...', pParent);
						if ( result['pass'] ) {
							that.mLogger.debug('...pass=%s', result['pass'])
							return exec_command( oCmd, oCmdOptions );
						} else {
							return Promise.resolve( result );
						}
					}, function( data ) {
						that.mLogger.info('[%s] Error in test. Command [%s] will be skipped.', pParent, pKey);
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
					//	that.mLogger.info('Unexpected error from test.');
					//	//return Promise.reject ( error );
					//	return Promise.resolve( data ); //{ error: error, pass: false } );
					//})
					.then(function( result ) {
						//console.log('##### then() after executing command!!!!!');
						if ( result['pass'] ) {
							that.mLogger.info('[%s] ...command [%s] executed.', pParent, pKey );
							//console.dir( result );
						} else {
							that.mLogger.debug('[%s] ...command [%s] skipped (test failed).', pParent, pKey );
						}
						asPromised( resolve, result);
					}, function( error ) {
						//TODO: WARNING: Problem is here, we don't know if it's the Promise.reject() from error from test or error from executing the command itself.
						//console.log('##### error() after executing command!!!!!');
						that.mLogger.error('[%s] Error while executing command [%s].', pParent, pKey, error );
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
					that.mLogger.info('[%s] No test for [%s]...', pParent, pKey);
					exec_command( oCmd, oCmdOptions )
					.then(function( result ) {
						that.mLogger.info('[%s] ...command [%s] executed.', pParent, pKey );
						//resolve();
						asPromised( resolve, result);
					}, function( error ) {
						that.mLogger.error('[%s] Error while executing command [%s].', pParent, pKey, error );
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
				that.mLogger.error('[%s] Unexpected error executing command %s.', pParent, pKey, e);
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
	}
}

ModClass.prototype._exec = function( pParent, pKey, pSpecs, pExecutor, pContext ) {
	var that = this;
	return function( pPreviousData ) {
		//console.log('# commands: pPreviousData=');
		//console.log( JSON.stringify( pPreviousData ) );
		// (pPreviousData && pPreviousData.length > 0 && (pPreviousData[ pPreviousData.length - 1 ]['exit'] || pPreviousData[ pPreviousData.length - 1 ]['skip'] ) )
		if ( !pExecutor ) {
			return Promise.resolve( pPreviousData );
		}
		var oPromises = [];
		if ( pKey.indexOf("{{") < 0 ) {
			// normal way
			oPromises.push( that._single_exec( pParent, pKey, pSpecs, pExecutor, pContext ) );	
		} else {
			var oConfig = {};
			oConfig[ pKey ] = pSpecs;
			var oConfigs = that._evaluateObject( oConfig, pContext );
			var oConfigKeys = Object.keys(oConfigs);
			that.mLogger.debug('[%s] Running multiple commands for key [%s] (%s in total)...', pParent, pKey, oConfigKeys.length);
			
			oConfigKeys.forEach( function(e, i) {
				var oSpecs = oConfigs[e];
				//console.log("#### Running command [" + e + "] with:");
				//console.dir( oSpecs );
				oPromises.push( that._single_exec( pParent, e, oSpecs, pExecutor, pContext, i ) );
			});
		}
		return Promises.chain( oPromises, pPreviousData, CHAIN_EVAL, { name: "command_" + pKey, logger: that.mLogger } );
		//NOT SURE HERE if we should process the results first before sending it back
		
		
		//if ( pPreviousData['exit'] || !pExecutor ) {
		//	return Promise.resolve( pPreviousData );
		//}
		//console.log('commands._exec: PreviousData=');
		//console.dir( pPreviousData );
		//if ( pPreviousData['etl']['exit'] ) {
		//	return Promise.resolve( pPreviousData );
		//} else {
		
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
		that.mLogger.debug('[%s] Processing commands...', pParent);
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
			Promises.chain( oPromises, oResult, CHAIN_EVAL, { name: "commands", logger: that.mLogger } )
			.then(function( data ) {
				that.mLogger.info('[%s] Done processing commands.', pParent);
				that.mLogger.info('[%s] Results:\n%j', pParent, data);
				//console.log('commands.handle(): data = %j', data);
				//console.dir( data );
				resolve( oResult );
			}, function( error ) {
				that.mLogger.error('[%s] Unexpected error running commands.', pParent, error);
				reject( error );
			});
		} catch (e) {
			that.mLogger.error('[%s] Unexpected error processing commands.', pParent, e);
			reject( e );
		}
	});
}

exports = module.exports = ModClass;
