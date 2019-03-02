const Promises = require('../../lib/promises');
const SimpleLogger = require('../../lib/logger');

var logger = new SimpleLogger();

ModClass = function( pETL ) {
	if( pETL ) pETL.mod( 'collects', this, function( pSettings, pLogger ) {
		if ( pLogger ) logger = pLogger;
	});
}


ModClass.prototype._do = function( pParent, pKey, pConfig, pExecutor) {
	return function( pData ) {
		return new Promise( function( resolve, reject ) {
			//var oResult = [];
			logger.debug('[%s:%s] previous data=[%s]', pParent, pKey, pData);
			if ( pData != null ) {
				pData.collects[ pKey ] = pConfig;
				/*
				if ( Array.isArray( pData ) ) {
					oResult = pData.slice();
				} else {
					oResult.push( pData );
				}
				*/
			}
			//oResult.push( pConfig['result'] );
			//resolve( oResult );
			resolve( pData );
		});
	}
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pActivityContext, pContext ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] In report mod. Activity context=[%s], Global context=[%s]', pParent, pActivityContext, pContext);
		try {
			var oData = { 'collects' : {} };
			var oPromises = [];
			for (var i in pConfig) {
				oPromises.push( that._do( pParent, i, pConfig[i], pExecutor ));
			}
			Promises.seq( oPromises, oData ).then(function( pData ) {
				logger.debug('[%s] Done processing commands. Data=[%s]', pParent, oData);
				resolve( oData );
			}, function( pError ) {
				logger.error('[%s] Unexpected error running commands.', pParent, pError);
				reject( pError );
			});
		} catch (e) {
			logger.error('[%s] Unexpected error processing commands.', pParent, e);
			reject( e );
		}
		
	});
}

exports = module.exports = ModClass;
