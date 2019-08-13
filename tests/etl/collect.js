const Promises = require('../../lib/promises');
const SimpleLogger = require('../../lib/logger');

var logger = new SimpleLogger();

ModClass = function( pETL ) {
	if( pETL ) pETL.mod( 'collects', this, function( pSettings, pLogger ) {
		if ( pLogger ) logger = pLogger;
	});
}


ModClass.prototype._do = function( pParent, pKey, pConfig, pExecutor, pContext) {
	return function( pData ) {
		return new Promise( function( resolve, reject ) {
			//var oResult = [];
			logger.debug('[%s:%s] previous data=[%s]', pParent, pKey, pData);
			if ( pData != null ) {
				var d = { key: pKey, result: pConfig['result'] };
				//pData.collects[ pKey ] = pConfig;
				pData.results.push( d );
				if ( pConfig['var'] ) {
					d['var'] = pConfig['var'];
					pContext.vars[ pConfig['var'] ] = pConfig['result'];
				}
			}
			resolve( pData );
		});
	}
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pContext ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] In Collect mod. Context=[%j]', pParent, pContext);
		try {
			var oResult = { exit: false, skip: false, results: [] };
			var oPromises = [];
			for (var i in pConfig) {
				oPromises.push( that._do( pParent, i, pConfig[i], pExecutor, pContext ));
			}
			Promises.seq( oPromises, oResult ).then(function( pData ) {
				logger.debug('[%s] Done processing commands. Data=[%j]', pParent, oResult);
				resolve( oResult );
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
