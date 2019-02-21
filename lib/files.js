const winston = require('winston');
const Fs = require('fs');
const Promises = require('./promises');

var asPromised = function( pPreviousData, pKey, func, data) {
	if ( ! pPreviousData.files[pKey] ) pPreviousData.files[pKey] = {};
	pPreviousData.files[pKey] = data;
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

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'files', this, function( pSettings ) {
		that.mSettings = pSettings;
	});
}

ModClass.prototype._download = function( pParent, pExecutor, pTarget, pSource ) {
	return function( pPreviousData ) {
		return new Promise( function( resolve, reject ) {
			pExecutor.exec('[ ! -d $(dirname "' + pTarget + '") ] && mkdir -p $(dirname "' + pTarget + '"); wget -O "' + pTarget + '" "' + pSource + '" 2>&1', {}, function( error, stdout, stderr ) {
				var data = { error: error, result: null, message: null, exit: false, pass: true, _stdout: stdout, _stderr: stderr,  };
				var func = null;
				
				if ( error ) {
					winston.log('error', '[%s] Error getting file [%s]. exit code = %s, error = %s"', pParent, pSource, error.code, error);
					//reject( error );
					func = reject;
					data.result = stderr;
				} else {
					//resolve();
					func = resolve;
					data.result = stdout;
				}
				asPromised( pPreviousData, pTarget, func, data );
			});
		});
	}
};

ModClass.prototype._create = function( pParent, pExecutor, pTarget, pContent ) {
	return function( pPreviousData ) {
		return new Promise( function( resolve, reject ) {
			pExecutor.writeFile(pTarget, pContent, function( error, stdout, stderr ) {
				var data = { error: error, result: null, message: null, exit: false, pass: true, _stdout: stdout, _stderr: stderr,  };
				var func = null;
				
				if ( error ) {
					winston.log('error', '[%s] Error creating file with content.', pParent, error);
					//reject( error );
					func = reject;
					data.result = stderr;
				} else {
					winston.log('debug', '[%s] Done creating file with content.', pParent);
					//resolve( stdout );
					func = resolve;
					data.result = stdout;
				}
				asPromised( pPreviousData, pTarget, func, data );
			});
		});
	}
};

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pData ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		winston.log('debug', '[%s] Processing files...', pParent);
		try {
			var oData = { 'files' : {} };
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
			Promises.seq( oPromises, oData).then(function( pData ) {
				winston.log('debug', '[%s] Done processing files.', pParent);
				//resolve( pData );
				resolve( oData );
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