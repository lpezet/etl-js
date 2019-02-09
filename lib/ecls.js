const winston = require('winston');
const Fs = require('fs');
//const Promise = require("promised-io/promise").Promise;
//const PromiseSeq = require("promised-io/promise").seq;
const Promises = require('./promises');


ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'ecls', this, function( pSettings ) {
		that.mSettings = pSettings;
	});
}

var promise_executor = function( pExecutor, pFunc ) {
	var oArguments = arguments;
	return new Promise( function( resolve, reject) {
	
		var oArgs = Array.prototype.slice.call( oArguments );
		oArgs = oArgs.slice(2);
		
		var oArgs = oArgs.concat( [ function( error, stdout, stderr) {
			if ( error ) {
				reject( error );
			} else {
				resolve( stdout );
			}
		} ]);
		pFunc.apply( pExecutor, oArgs )
		
	});
}

ModClass.prototype._read_config = function( pConfig ) {
	var oDefaults = {
		cluster: null,
		queue: null,
		graph: null,
		timeout: null,
		ecl: null,
		file: null,
		// default | csv | csvh | xml | runecl | bin(ary)
		format: null,
		output: null,
		jobname: null,
		pagesize: 500
	}
	
	// WARNING: defaults will be affected here, don't make it a global thing, or change logic here, by first copying defaults into empty object.
	var oConfig = oDefaults;
	for (var i in pConfig) {
		oConfig[ i.toLowerCase() ] = pConfig[i];
	}
	
	return oConfig;
}


ModClass.prototype._wrap_run = function( pParent, pKey, pConfig, pExecutor ) {
	var that = this;
	return function() { 
		winston.log('debug', '[%s] Executing ecl...', pParent );
		try {
			return that._run( pParent, pKey, pConfig, pExecutor );
		} catch (e) {
			winston.log('error', '[%s] Error executing ecl.', pParent );
		} finally {
			winston.log('debug', '[%s] Done executing ecl.', pParent );
		}
	};
}

ModClass.prototype._run = function( pParent, pKey, pConfig, pExecutor ) {
	return new Promise( function( resolve, reject) {
		try {
			var oCmdArgs = [];
			oCmdArgs.push("action=query");
			for ( var i in pConfig ) {
				switch (i) {
					case "cluster":
						oCmdArgs.push("cluster=" + pConfig[i]);
						break;
					case "output":
						oCmdArgs.push("output=" + pConfig[i]);
						break;
					case "format":
						oCmdArgs.push("format=" + pConfig[i]);
						break;
					default:
						//TODO
						break;
				}
				//console.log('i=' + i + ', config=' + pConfig[i]);
			}
			
			if ( pConfig['content'] ) {
				oCmdArgs.push('@/tmp/ecl-js.ecl');
				var oCmd = "/usr/bin/eclplus " + oCmdArgs.join(' ');
				
				promise_executor( pExecutor, pExecutor.writeFile, '/tmp/ecl-js.ecl', pConfig['content'] )
				.then( function( pData) {
					winston.log('debug', '[%s] Done creating ecl file. Executing ecl...', pParent);
					pExecutor.exec( oCmd, {}, function( error, stdout, stderr ) {
						winston.log('debug', '[%s] Done executing ECL.', pParent);
						if ( error ) {
							reject( error );
						} else {
							resolve( stdout );
						}
					});
				}, function( pError ) {
					winston.log('error', '[%s] Error executing ECL.', pParent, pError);
				});
				
			} else if ( pConfig['file'] ) {
				promise_executor( pExecutor, pExecutor.exec, 'wget -O /tmp/etl-js.ecl "' + pConfig['file'] + '"', {} )
				.then( function( pData) {
					//console.log('Done writing to file!' + pData);
					pExecutor.exec( oCmd, {}, function( error, stdout, stderr ) {
						winston.log('debug', '[%s] Done downloading ecl file [%s].', pParent, pConfig['file']);
						if ( error ) {
							reject( error );
						} else {
							resolve( stdout );
						}
					});
				}, function( pError ) {
					winston.log('error', '[%s] Error downloading ECL file [%s].', pParent, pConfig['file'], pError);
					reject( pError );
				});
			} else {
				reject('Must specify at least file: or content: to run ECL code.');
			}
			
		} catch (e) {
			winston.log('error', '[%s] Unexpected error processing step.', pParent, e);
			reject( e );
		}
	});
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pData ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		winston.log('debug', '[%s] Running ECL...', pParent);
		try {
			var oPromises = [];
			
			for (var i in pConfig) {
				var oECLConfig = that._read_config( pConfig[i] );
				oPromises.push( that._wrap_run( pParent, i, oECLConfig, pExecutor ) );
			}
			Promises.seqConcatResults( oPromises ).then(function( pData ) {
				resolve( pData );
			}, function( pError ) {
				winston.log('error', '[%s] Error running ECL.', pParent, pError);
				reject( pError );
				
			});
		} catch (e) {
			reject( e );
			winston.log('error', '[%s] Unexpected error running ECL.', pParent, e);
		}
	});
}



exports = module.exports = ModClass;