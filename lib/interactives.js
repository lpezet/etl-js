const Promises = require('./promises');
const readline = require('readline');
const SimpleLogger = require('./logger');

var logger = new SimpleLogger();

var asPromised = function( pResults, pFunc, pParent, pKey, pData) {
	logger.debug('[%s] Interactive [%s] results:\n%j', pParent, pKey, pData);
	//if ( ! pPreviousData.commands[pKey] ) pPreviousData.commands[pKey] = {};
	//pPreviousData.commands[pKey] = data;
	var data = { interactive: pKey, results: pData, exit: Boolean(pData['exit']), skip: Boolean(pData['skip']) };
	//data[ pKey ] = pData;
	pResults.exit = pResults.exit || Boolean(pData['exit']);
	pResults.skip = pResults.skip || Boolean(pData['skip']);
	pResults.results.push( data );
	pFunc( pResults );
}

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'interactives', this, function( pSettings, pLogger ) {
		that.mSettings = pSettings;
		if ( pLogger ) logger = pLogger;
	});
}

ModClass.prototype._exec = function( pParent, pKey, pSpecs, pExecutor, pContext ) {
	var that = this;
	return function( pResults ) {
		//if ( pResults['_exit'] ) {
		//	return Promise.resolve( pResults );
		//}
		return new Promise( function( resolve, reject ) {
			var data = { error: null, result: null, message: null, exit: false, skip: false, _stdout: null, _stderr: null };
			const rlOpts = {
				input: that.mSettings['input'] ? that.mSettings['input'] : process.stdin,
				output: that.mSettings['output'] ? that.mSettings['output'] : process.stdout
			};
			const rl = readline.createInterface(rlOpts);
			try {
				var prompt = pSpecs['prompt'];
				rl.question(prompt, (answer) => {
					rl.close();
					var oVarName = pSpecs['var'];
					if ( oVarName ) {
						pContext.vars[ oVarName ] = answer;
					}
					data.result = answer;
					asPromised( pResults, resolve, pParent, pKey, data );
				});
			} catch (e) {
				data.error = e;
				asPromised( pResults, reject, pParent, pKey, data );
			}
		});
	}
};

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pContext ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] Processing Interactive...', pParent);
		try {
			var oResult = { exit: false, skip: false, results: [] };
			var oPromises = [];
			for (var i in pConfig) {
				var oTarget = i;
				logger.debug('[%s] Interactive...', pParent, oTarget);
				oPromises.push( that._exec( pParent, i, pConfig[i], pExecutor, pContext ) );
			}
			Promises.seq( oPromises, oResult ).then(function( pData ) {
				logger.debug('[%s] Done processing interactives.', pParent);
				resolve( pData );
			}, function( pError ) {
				logger.error('[%s] Error during interactives.', pParent, pError);
				reject( pError );
			});
		} catch (e) {
			reject( e );
			logger.error('[%s] Unexpected error processing interactives.', pParent, e);
		}
	});
}

exports = module.exports = ModClass;
