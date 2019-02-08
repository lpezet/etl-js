const winston = require('winston');
const Fs = require('fs');
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
	return function() {
		return new Promise( function( resolve, reject ) {
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
				
				var oCmdArgs = [];
				
				var exec_command = function( pCmd, pCmdOptions ) {
					return new Promise(function( resolve, reject ) {
						winston.log('debug', '[%s] Running command...', pParent);
						var oProcess = pExecutor.exec( pCmd, pCmdOptions, function( error, stdout, stderr ) {
							if ( error ) {
								reject( util.format.apply(null, [ 'Command [%s] exited with code %s: %s.', pKey, error.code, error] ));
							} else {
								winston.log('debug', '[%s] Command [%s] completed.', pParent, pKey);
								resolve();
							}
						});
					});
				}
				
				var exec_test = function( pTest ) {
					winston.log('info', '[%s] Test for command [%s]...', pParent, pKey);
					var oTest = '(' + pTest + ') && echo "continue" || echo "stop"';
					return new Promise(function( resolve, reject ) {
						var oProcess = pExecutor.exec( oTest, { context: pKey }, function( error, stdout, stderr ) {
							if ( error ) {
								winston.log('debug', '[%s] Test failed for command [%s], exit code = %s, error = %s. Skipping command.', pParent, pKey, error.code, error);
								reject( error );
							} else {
								if ( ! stdout ) {
									winston.log('error', '[%s] Unexpected test result (stdout=[%s]). Skipping command %s.', pParent, stdout, pKey );
									reject( stdout );
								} else if ( stdout.match(/continue/g) ) {
									winston.log('info', '[%s] Test passed for command [%s].', pParent, pKey );
									resolve();
								} else {
									winston.log('info', '[%s] Test failed. Skipping command [%s].', pParent, pKey );
									winston.log('debug', '[%s] Test output for command [%s]: [%s]', pParent, pKey, stdout );
									reject( stdout );
								}
							}
						});
					});
				}
				
				if ( oTest ) {
					exec_test( oTest )
					.then(function( result ) {
						return exec_command( oCmd, oCmdOptions );
					}, function( error ) {
						// continue for other commands
						resolve();
					})
					.then(function( result ) {
						winston.log('info', '[%s] Command [%s] executed.', pParent, pKey );
						resolve();
					}, function( error ) {
						winston.log('error', '[%s] Error while executing command [%s].', pParent, pKey, error );
						resolve();
					});
				} else {
					winston.log('info', '[%s] No test for [%s]...', pParent, pKey);
					exec_command( oCmd, oCmdOptions )
					.then(function( result ) {
						winston.log('info', '[%s] Command [%s] executed.', pParent, pKey );
						resolve();
					}, function( error ) {
						winston.log('error', '[%s] Error while executing command [%s].', pParent, pKey, error );
						resolve();
					});
				}
				
			} catch ( e ) {
				winston.log('error', '[%s] Unexpected error executing command %s.', pParent, pKey);
				reject( e );
			}
		});
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

ModClass.prototype.handle = function( pParent, pConfig, pExecutor ) {
	//var oPromise = new Promise();
	var that = this;
	return new Promise( function( resolve, reject ) {
		winston.log('debug', '[%s] Processing commands...', pParent);
		try {
			var oPromises = [];
			for (var i in pConfig) {
				oPromises.push( that._exec( pParent, i, pConfig[i], pExecutor ));
			}
			
			//PromiseSeqConcatResults
			Promises.seqConcatResults( oPromises ).then(function( pData ) {
				winston.log('debug', '[%s] Done processing commands.', pParent);
				resolve( pData );
			}, function( pError ) {
				winston.log('error', '[%s] Unexpected error running commands.', pParent, pError);
				reject( pError );
			});
		} catch (e) {
			winston.log('error', '[%s] Unexpected error processing step.', pParent, e);
			reject( e );
		}
	});
}



exports = module.exports = ModClass;