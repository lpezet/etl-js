const winston = require('winston');
const Promises = require('../../lib/promises');
const util = require('util');

ModClass = function( pETL ) {
	var that = this;
	if( pETL ) pETL.mod( 'collector', this);
}


ModClass.prototype._do = function( pParent, pKey, pConfig, pExecutor) {
	return function( pData ) {
		return new Promise( function( resolve, reject ) {
			var oResult = [];
			winston.log('debug', '[%s:%s] previous data=[%s]', pParent, pKey, pData);
			if ( pData != null ) {
				if ( Array.isArray( pData ) ) {
					oResult = pData.slice();
				} else {
					oResult.push( pData );
				}
			}
			oResult.push( pConfig['result'] );
			resolve( oResult );
		});
	}
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pData ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		winston.log('debug', '[%s] In report mod. Previous data=[%s]', pParent, pData);
		try {
			var oPromises = [];
			for (var i in pConfig) {
				oPromises.push( that._do( pParent, i, pConfig[i], pExecutor ));
			}
			Promises.seq( oPromises, pData ).then(function( pData ) {
				winston.log('debug', '[%s] Done processing commands. Data=[%s]', pParent, pData);
				resolve( pData );
			}, function( pError ) {
				winston.log('error', '[%s] Unexpected error running commands.', pParent, pError);
				reject( pError );
			});
		} catch (e) {
			winston.log('error', '[%s] Unexpected error processing commands.', pParent, e);
			reject( e );
		}
		
	});
}

exports = module.exports = ModClass;