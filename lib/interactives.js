const Promises = require('./promises');
const readline = require('readline');
const SimpleLogger = require('./logger');

var logger = new SimpleLogger();

var asPromised = function( pResults, pFunc, pKey, pData) {
	if ( ! pResults.interactives[pKey] ) pResults.interactives[pKey] = {};
	pResults.interactives[pKey] = pData;
	/*
	if ( pData['exit'] ) {
		pResults['_exit'] = pData['exit'];
		pResults['_exit_from'] = pKey;
	}
	*/
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

ModClass.prototype._exec = function( pParent, pKey, pSpecs, pExecutor ) {
	return function( pResults ) {
		//if ( pResults['_exit'] ) {
		//	return Promise.resolve( pResults );
		//}
		return new Promise( function( resolve, reject ) {
			var data = { error: null, result: null, message: null, exit: false, pass: true, _stdout: null, _stderr: null };
			const rl = readline.createInterface({
			  input: process.stdin,
			  output: process.stdout
			});
			try {
				var prompt = pSpecs['prompt'];
				rl.question(prompt, (answer) => {
					rl.close()
					data.result = answer;
					asPromised( pResults, resolve, pKey, data );
				});
			} catch (e) {
				data.error = e;
				asPromised( pResults, reject, pKey, data );
			}
		});
	}
};

ModClass.prototype.handle = function( pParent, pConfig, pExecutor ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] Processing Interactive...', pParent);
		try {
			var oData = { 'interactives' : {} };
			var oPromises = [];
			for (var i in pConfig) {
				var oTarget = i;
				logger.debug('[%s] Interactive...', pParent, oTarget);
				oPromises.push( that._exec( pParent, i, pConfig[i], pExecutor ) );
			}
			Promises.seq( oPromises, oData ).then(function( pData ) {
				logger.debug('[%s] Done processing interactives.', pParent);
				resolve( pData );
			}, function( pError ) {
				logger.error('[%s] Unexpected error Interactive.', pParent, pError);
				reject( pError );
			});
		} catch (e) {
			reject( e );
			logger.error('[%s] Unexpected error processing step.', pParent, e);
		}
	});
}

exports = module.exports = ModClass;
