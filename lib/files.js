const winston = require('winston');
const Fs = require('fs');
const Promise = require("promised-io/promise").Promise;
const PromiseSeq = require("promised-io/promise").seq;


ModClass = function() {
	
}

ModClass.prototype._exec = function( pExecutor, pTarget, pSource ) {
	return function() {
		var oPromise = new Promise();
		var oProcess = pExecutor.exec('[ ! -d $(dirname "' + pTarget + '") ] && mkdir -p $(dirname "' + pTarget + '"); wget -O "' + pTarget + '" "' + pSource + '"', {}, function( error, stdout, stderr ) {
			if ( error ) {
				winston.log('error', '[%s] Error getting file [%s]. exit code = %s, error = %s"', pParent, pSource, error.code, error);
				oPromise.reject( error );
			} else {
				oPromise.resolve();
			}
		});
		return oPromise;
	}
};

ModClass.prototype.handle = function( pParent, pConfig, pExecutor ) {
	var oPromise = new Promise();
	winston.log('debug', '[%s] Processing files...', pParent);
	try {
		var oPromises = [];
		for (var i in pConfig) {
			var oTarget = i;
			var oSource = pConfig[i].source;
			winston.log('debug', '[%s] File command: wget -o %s "%s"', pParent, oTarget, oSource);
			oPromises.push( this._exec( pExecutor, oTarget, oSource ) );
			//oPromise.resolve();
			//winston.log('info', 'Gotta do something like:\nwget -o %s "%s"', oTarget, oSource);
		}
		PromiseSeq( oPromises, {} ).then(function( pData ) {
			oPromise.resolve( pData );
		}, function( pError ) {
			winston.log('error', '[%s] Unexpected error getting file.', pParent, pError);
			oPromise.reject( pError );
		});
	} catch (e) {
		oPromise.reject( e );
		winston.log('error', '[%s] Unexpected error processing step.', pParent, e);
	} finally {
		winston.log('debug', '[%s] Done processing files.', pParent);
	}
	return oPromise;
}



exports = module.exports = ModClass;