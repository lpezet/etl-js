const winston = require('winston');
const util = require('util');
const Promises = require('./promises');

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'commands', this, function( pSettings ) {
		that.mSettings = pSettings;
	});
}

ModClass.prototype._exec = function( pParent, pKey, pSpecs, pExecutor ) {
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
					winston.log('debug', '[%s] Executing command [%s]...', pParent, pKey);
					var oCmdSpecs = pSpecs;
					var oCwd = oCmdSpecs['cwd'];
					var oTest = oCmdSpecs['test'];
					var oCmd = oCmdSpecs['command'];
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
							winston.log('debug', '[%s] Running command...', pParent);
							pExecutor.exec( pCmd, pCmdOptions, function( error, stdout, stderr ) {
								var data = { error: error, result: null, message: null, exit: false, pass: true, _stdout: stdout, _stderr: stderr };
								if ( error ) {
									winston.log('error', '[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error);
									//reject( util.format.apply(null, [ '[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error ] ));
									data.result = stderr;
									data.message = util.format.apply(null, [ '[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error ] );
									reject( data );
								} else {
									winston.log('debug', '[%s] Command [%s] completed.', pParent, pKey);
									//resolve( stdout );
									data.result = stdout;
									if ( oCmdSpecs['result_as_json'] === true ) {
										try {
											data.result = JSON.parse( stdout );
										} catch(e) {
											winston.log('warn', '[%s] Error with command [%s]. Could not parse stdout as JSON: [%s] not a valid JSON string.', pParent, pKey, stdout);
										}
									}
									resolve( data )
								}
							});
						});
					}
					
					var exec_test = function( pTest ) {
						winston.log('info', '[%s] Test for command [%s]...', pParent, pKey);
						var oTest = '(' + pTest + ') && echo "continue" || echo "stop"';
						return new Promise(function( resolve, reject ) {
							pExecutor.exec( oTest, { context: pKey }, function( error, stdout, stderr ) {
								var data = { error: error, result: null, message: null, exit: false, pass: false, _stdout: stdout, _stderr: stderr };
								var func = null;
								//console.log('###### Done executing test command...');
								if ( error ) {
									winston.log('error', '[%s] Test failed for command [%s], exit code = %s, error = %s. Skipping command.', pParent, pKey, error.code, error);
									//reject( error );
									//var oData = { error: error, exit: false, context: pParent + '..' + pKey };
									if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
									//reject( data )
									func = reject;
								} else {
									if ( ! stdout ) {
										winston.log('error', '[%s] Unexpected test result (stdout=[%s]). Skipping command %s.', pParent, stdout, pKey );
										//reject( stdout );
										//var oData = { error: error, exit: false, context: pParent + '..' + pKey };
										if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
										//reject( oData )
										func = reject;
									} else if ( stdout.match(/continue/g) ) {
										winston.log('info', '[%s] Test passed for command [%s].', pParent, pKey );
										//resolve();
										data.pass = true;
										func = resolve;
									} else {
										winston.log('info', '[%s] Test failed. Skipping command [%s].', pParent, pKey );
										winston.log('debug', '[%s] Test output for command [%s]: [%s]', pParent, pKey, stdout );
										//reject( stdout );
										//var oData = { error: error, exit: false, context: pParent + '..' + pKey };
										if ( oCmdSpecs['exit_on_test_failed'] ) data.exit = true;
										data.pass = false;
										//reject( oData )
										func = resolve;
									}
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
								winston.log('info', '[%s] Command [%s] executed.', pParent, pKey );
								//console.dir( result );
							} else {
								winston.log('debug', '[%s] Command [%s] skipped (test failed).', pParent, pKey );
								
							}
							asPromised( resolve, result);
						}, function( error ) {
							//TODO: WARNING: Problem is here, we don't know if it's the Promise.reject() from error from test or error from executing the command itself.
							
							//console.log('##### error() after executing command!!!!!');
							winston.log('error', '[%s] Error while executing command [%s].', pParent, pKey, error );
							if ( error['exit'] ) {
								//resolve();
								asPromised( reject, error);
							} else {
								asPromised( resolve, error);
							}
						});
					} else {
						winston.log('info', '[%s] No test for [%s]...', pParent, pKey);
						exec_command( oCmd, oCmdOptions )
						.then(function( result ) {
							winston.log('info', '[%s] Command [%s] executed.', pParent, pKey );
							//resolve();
							asPromised( resolve, result);
						}, function( error ) {
							winston.log('error', '[%s] Error while executing command [%s].', pParent, pKey, error );
							//resolve();
							asPromised( resolve, error);
						});
					}
					
				} catch ( e ) {
					winston.log('error', '[%s] Unexpected error executing command %s.', pParent, pKey);
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

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pContext ) {
	//var oPromise = new Promise();
	//console.log('commands.handle: data = ');
	//console.dir( pData );
	var that = this;
	return new Promise( function( resolve, reject ) {
		winston.log('debug', '[%s] Processing commands...', pParent);
		try {
			var oData = { 'commands' : {} };
			var oPromises = [];
			for (var i in pConfig) {
				oPromises.push( that._exec( pParent, i, pConfig[i], pExecutor ));
			}
			
			//PromiseSeqConcatResults
			//Promises.seqConcatResults( oPromises ).then(function( pData ) {
			Promises.seq( oPromises, oData ).then(function( data ) {
				winston.log('debug', '[%s] Done processing commands.', pParent);
				//console.log('Data=');
				//console.dir( data );
				resolve( oData );
			}, function( error ) {
				winston.log('error', '[%s] Unexpected error running commands.', pParent, error);
				reject( error );
			});
		} catch (e) {
			winston.log('error', '[%s] Unexpected error processing commands.', pParent, e);
			reject( e );
		}
	});
}

exports = module.exports = ModClass;
