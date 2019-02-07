const winston = require('winston');
const Fs = require('fs');
const Promises = require('./promises');

ModClass = function() {
	
}

ModClass.prototype._exec = function( pExecutor, pTarget, pSource ) {
	return function() {
		return new Promise( function( resolve, reject ) {
			pExecutor.exec('[ ! -d $(dirname "' + pTarget + '") ] && mkdir -p $(dirname "' + pTarget + '"); wget -O "' + pTarget + '" "' + pSource + '"', {}, function( error, stdout, stderr ) {
				if ( error ) {
					winston.log('error', '[%s] Error getting file [%s]. exit code = %s, error = %s"', pParent, pSource, error.code, error);
					reject( error );
				} else {
					resolve();
				}
			});
		});
	}
};

ModClass.prototype.handle = function( pParent, pConfig, pExecutor ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		winston.log('debug', '[%s] Processing files...', pParent);
		try {
			var oPromises = [];
			for (var i in pConfig) {
				var oTarget = i;
				var oSource = pConfig[i].source;
				winston.log('debug', '[%s] File command: wget -o %s "%s"', pParent, oTarget, oSource);
				oPromises.push( that._exec( pExecutor, oTarget, oSource ) );
				//oPromise.resolve();
				//winston.log('info', 'Gotta do something like:\nwget -o %s "%s"', oTarget, oSource);
			}
			Promises.seqConcatResults( oPromises ).then(function( pData ) {
				resolve( pData );
			}, function( pError ) {
				winston.log('error', '[%s] Unexpected error getting file.', pParent, pError);
				reject( pError );
			});
		} catch (e) {
			reject( e );
			winston.log('error', '[%s] Unexpected error processing step.', pParent, e);
		} finally {
			winston.log('debug', '[%s] Done processing files.', pParent);
		}
	});
}



exports = module.exports = ModClass;