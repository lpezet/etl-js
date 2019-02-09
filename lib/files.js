const winston = require('winston');
const Fs = require('fs');
const Promises = require('./promises');

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'files', this, function( pSettings ) {
		that.mSettings = pSettings;
	});
}

ModClass.prototype._download = function( pParent, pExecutor, pTarget, pSource ) {
	return function() {
		return new Promise( function( resolve, reject ) {
			pExecutor.exec('[ ! -d $(dirname "' + pTarget + '") ] && mkdir -p $(dirname "' + pTarget + '"); wget -O "' + pTarget + '" "' + pSource + '" 2>&1', {}, function( error, stdout, stderr ) {
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

ModClass.prototype._create = function( pParent, pExecutor, pTarget, pContent ) {
	return function() {
		return new Promise( function( resolve, reject ) {
			pExecutor.writeFile(pTarget, pContent, function( error, stdout, stderr ) {
				if ( error ) {
					winston.log('error', '[%s] Error creating file with content.', pParent, error);
					reject( error );
				} else {
					winston.log('debug', '[%s] Done creating file with content.', pParent);
					resolve( stdout );
				}
			});
		});
	}
};

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pData ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		winston.log('debug', '[%s] Processing files...', pParent);
		try {
			var oPromises = [];
			for (var i in pConfig) {
				var oTarget = i;
				if ( pConfig[i].source ) {
					var oSource = pConfig[i].source;
					winston.log('debug', '[%s] File command: wget -o %s "%s"', pParent, oTarget, oSource);
					oPromises.push( that._download( pParent, pExecutor, oTarget, oSource ) );
				} else if ( pConfig[i].content ) {
					var oContent = pConfig[i].content;
					winston.log('debug', '[%s] Creating file [%s] with content...', pParent, oTarget);
					oPromises.push( that._create( pParent, pExecutor, oTarget, oContent ) );
				}
				//oPromise.resolve();
				//winston.log('info', 'Gotta do something like:\nwget -o %s "%s"', oTarget, oSource);
			}
			Promises.seqConcatResults( oPromises ).then(function( pData ) {
				winston.log('debug', '[%s] Done processing files.', pParent);
				resolve( pData );
			}, function( pError ) {
				winston.log('error', '[%s] Unexpected error getting file.', pParent, pError);
				reject( pError );
			});
		} catch (e) {
			winston.log('error', '[%s] Unexpected error processing step.', pParent, e);
			reject( e );
		}
	});
}



exports = module.exports = ModClass;