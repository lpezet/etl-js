const winston = require('winston');
const Fs = require('fs');
const Promise = require("promised-io/promise").Promise;
const PromiseSeq = require("promised-io/promise").seq;


ModClass = function() {
}

var promise_executor = function( pExecutor, pFunc ) {
	var oPromise = new Promise();
	
	var oArgs = Array.prototype.slice.call( arguments );
	oArgs = oArgs.slice(2);
	
	var oArgs = oArgs.concat( [ function( error, stdout, stderr) {
		if ( error ) {
			oPromise.reject( error );
		} else {
			oPromise.resolve( stdout );
		}
	} ]);
	pFunc.apply( pExecutor, oArgs )
	return oPromise;
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


ModClass.prototype._wrap_run = function( pParent, pConfig, pExecutor ) {
	var that = this;
	return function() { 
		winston.log('debug', '[%s] Executing ecl...', pParent );
		try {
			return that._run( pParent, pConfig, pExecutor );
		} catch (e) {
			winston.log('error', '[%s] Error executing ecl.', pParent );
		} finally {
			winston.log('debug', '[%s] Done executing ecl.', pParent );
		}
	};
}

ModClass.prototype._run = function( pParent, pConfig, pExecutor ) {
	var oPromise = new Promise();
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
						oPromise.reject( error );
					} else {
						oPromise.resolve( stdout );
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
						oPromise.reject( error );
					} else {
						oPromise.resolve( stdout );
					}
				});
			}, function( pError ) {
				winston.log('error', '[%s] Error downloading ECL file [%s].', pParent, pConfig['file'], pError);
				oPromise.reject( pError );
			});
		} else {
			oPromize.reject('Must specify at least file: or content: to run ECL code.');
		}
		
	} catch (e) {
		oPromise.reject( e );
		winston.log('error', '[%s] Unexpected error processing step.', pParent, e);
	}
	return oPromise;
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor ) {
	var oPromise = new Promise();
	winston.log('debug', '[%s] Processing ecl...', pParent);
	try {
		var oPromises = [];
		
		for (var i in pConfig) {
			var oECLConfig = this._read_config( pConfig[i] );
			oPromises.push( this._wrap_run( i, oECLConfig, pExecutor ) );
		}
		PromiseSeq( oPromises, {} ).then(function( pData ) {
			oPromise.resolve( pData );
		}, function( pError ) {
			winston.log('error', '[%s] Unexpected error spraying.', pParent, pError);
			oPromise.reject( pError );
			
		});
	} catch (e) {
		oPromise.reject( e );
		winston.log('error', '[%s] Unexpected error processing step.', pParent, e);
	} finally {
		winston.log('debug', '[%s] Done processing ecl.', pParent);
	}
	return oPromise;
}



exports = module.exports = ModClass;