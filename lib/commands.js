const winston = require('winston');
//const { yamlParse, yamlDump } = require('yaml-cfn');
const Fs = require('fs');
const Promise = require("promised-io/promise").Promise;
const PromiseSeq = require("promised-io/promise").seq;
//const PromiseAll = require("promised-io/promise").all;
const util = require('util');

ModClass = function() {
	
}

ModClass.prototype._exec = function( pParent, pKey, pSpecs, pExecutor ) {
	return function() {
		var oPromise = new Promise();
		try {
			winston.log('debug', '[%s] Executing %s...', pParent, pKey);
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
			
			var exec_command = function() {
				winston.log('debug', '[%s] Running command...', pParent);
				var oProcess = pExecutor.exec( oCmd, oCmdOptions, function( error, stdout, stderr ) {
					if ( error ) {
						oPromise.reject( util.format.apply(null, [ 'Command exited with code %s: %s.', error.code, error] ));
					} else {
						oPromise.resolve();
					}
				});
			}
			
			if ( oTest ) {
				winston.log('info', '[%s] Test for %s...', pParent, pKey);
				
				//oTest = oTest.replace('"', '\\"');
				oTest = '(' + oTest + ') && echo "continue" || echo "stop"';
				var oProcess = pExecutor.exec( oTest, {}, function( error, stdout, stderr ) {
					if ( error ) {
						winston.log('debug', '[%s] Test failed for %s, exit code = %s, error = %s. Skipping command.', pParent, pKey, error.code, error);
						//oPromise.reject( 'Test failed for ' + pKey );
						oPromise.resolve();
					} else {
						if ( ! stdout ) {
							winston.log('error', '[%s] Unexpected test result (stdout=[%s]). Skipping command %s.', pParent, stdout, pKey );
							oPromise.resolve();
						} else if ( stdout.match(/continue/g) ) {
							winston.log('info', '[%s] Test passed for %s.', pParent, pKey );
							exec_command();
						} else {
							winston.log('info', '[%s] Test failed. Skipping command %s.', pParent, pKey );
							winston.log('debug', '[%s] Test output for command [%s]: [%s]', pParent, pKey, stdout );
							oPromise.resolve();
						}
					}
				});
			} else {
				winston.log('info', '[%s] No test for %s...', pParent, pKey);
				exec_command();
			}
			
		} catch ( e ) {
			winston.log('error', '[%s] Unexpected error executing command %s.', pParent, pKey);
			oPromise.reject( e );
		}
		return oPromise;
	}
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor ) {
	var oPromise = new Promise();
	winston.log('debug', '[%s] Processing commands...', pParent);
	try {
		var oPromises = [];
		for (var i in pConfig) {
			oPromises.push( this._exec( pParent, i, pConfig[i], pExecutor ));
		}
		PromiseSeq( oPromises, {} ).then(function( pData ) {
			oPromise.resolve( pData );
		}, function( pError ) {
			winston.log('error', '[%s] Unexpected error running commands.', pParent, pError);
			oPromise.reject( pError );
		});
	} catch (e) {
		winston.log('error', '[%s] Unexpected error processing step.', pParent, e);
		oPromise.reject( e );
	} finally {
		winston.log('debug', '[%s] Done processing commands.', pParent);
	}
	return oPromise;
}



exports = module.exports = ModClass;