const winston = require('winston');
const Promises = require('./promises');

var mod_settings = function( pSettings, pMod ) {
	if ( ! pSettings ) return {};
	if ( ! pSettings[ 'mods' ] ) return {};
	if ( ! pSettings[ 'mods' ][ pMod ] ) return {};
	return pSettings[ 'mods' ][ pMod ];
}

ModClass = function( pExecutor, pSettings ) {
	this.mSettings = pSettings || {};
	this.mMods = {};
	this.mExecutor = pExecutor;
	
}

ModClass.prototype.get_mods = function() {
	return this.mMods;
}

ModClass.prototype.mod = function( pKey, pSource, pCallback ) {
	if( this.mMods[ pKey ] ) throw "Mod for " + pKey + " already registered.";
	this.mMods[ pKey ] = pSource; //pFn.bind( pSource );
	if ( pCallback ) pCallback( mod_settings( this.mSettings, pKey ));
}

ModClass.prototype._chain_handler = function( pStepId, pKey, pStep, pHandler, pContext ) {
	var that = this;
	return function( pData ) { 
		try {
			return pHandler.handle( pStepId, pStep, that.mExecutor, pData, pContext );
		} catch( e ) {
			winston.log('error', '[%s] Error executing step for [%s].', pStepId, pKey, e );
			throw e;
		}
	};
}

ModClass.prototype._wrap_process = function( pStepId, pStep, pContext ) {
	var that = this;
	return function( pData ) { 
		winston.log('debug', '[%s] Executing activity...', pStepId );
		//console.log('etl._wrap_process: previousData=');
		//console.dir( pData );
		if ( pData['_exit'] ) {
			//TODO: log exit behavior here. Use _exit_from to log which section triggered exit.
			return Promise.resolve( pData ); //TODO: resolve?
		} else {
			try {
				return that._process( pStepId, pStep, pData, pContext );
			} catch (e) {
				winston.log('error', '[%s] Error executing activity.', pStepId );
				return Promise.reject( e ); //TODO: check e
			}
		}
	};
}

ModClass.prototype._process = function( pStepId, pStep, pPreviousStepData, pContext ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		var oProcesses = [];
		//winston.log('info', '[%s] Started activity...', pStepId);
		//console.log('etl._process: (1) pDataResults = ' + pDataResults);
		
		try {
			//
			//TODO: Rename pPreviousStepData into pContext
			//pPreviousStepData[ pStepId ] = {};
			
			for (var i in pStep ) {
				var oMod = that.mMods[ i ];
				if ( ! oMod ) {
					winston.log('error', 'Mod [%s] unknown. Skipping.', i);
				} else {
					oProcesses.push( that._chain_handler( pStepId, i, pStep[i], oMod, pContext ) );
				}
			}
			//Promises.seqConcatResults( oProcesses ).then( function( pData ) {
			Promises.seq( oProcesses, pPreviousStepData ).then( function( pData ) {
				winston.log('info', '[%s] Completed activity.', pStepId);
				//console.log('etl._process: (2) pData = ');
				//console.log(util.inspect(pData, false, null, true))
				
				/*
				console.log('etl._process: (2) pPreviousStepData = ');
				console.log(util.inspect(pPreviousStepData, false, null, true))
				console.log('etl._process: (2) pDataResults = ');
				console.log(util.inspect(pDataResults, false, null, true))
				console.log('etl._process: (2) pData = ');
				console.log(util.inspect(pData, false, null, true))
				*/
				
				//TODO: no need then:
				pContext[ pStepId ] = pData;
				//TODO: replace with:
				//resolve( pPreviousStepData );
				resolve( pData );
			},  function( pError ) {
				winston.log('error', '[%s] Errors during activity.', pStepId, pError );
				//console.log('etl._process: (3) pDataResults = ' + pDataResults);
				pContext[ pStepId ] = pError;
				reject( pError );
			} );
		} catch (e) {
			reject( e );
			winston.log('error', '[%s] Unexpected error during activity.', pStepId, e);
		}
	});
}

ModClass.prototype.process = function( pConfig, pParameters ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		winston.log('info', 'Starting ETL...', oStepId);
		try {
			var oETLSteps = pConfig["etl"];
			var oStepProcesses = [];
			var oData = { etl: {
				exit: false
			}};
			for (var i in oETLSteps) {
				var oStepId = oETLSteps[i];
				var oStep = pConfig[oStepId];
				if ( ! oStep ) {
					//TODO
					winston.log('warn', 'No configuration for activity [%s]. Skipping.', oStepId);
				} else {
					winston.log('debug', 'Encountered activity [%s]...', oStepId);
					oStepProcesses.push( that._wrap_process( oStepId, oStep, oData ) );
				}
			}
			Promises.seq( oStepProcesses, {} ).then( function( pData ) {
				//console.log('Done.');
				//console.log('oData=');
				//console.dir(oData);
				
				//resolve( pData );
				resolve( oData );
			},  function( pError ) {
				//console.log('Done (with errors).');
				//winston.log('error', 'Unexpected error running activities.', pError );
				//console.log('oData=');
				//console.dir(oData);
				//reject( pError );
				//oData['_error'] = pError;
				reject( oData );
			} );
		} catch (e) {
			winston.log('error', 'Unexpected error.', e );
			reject( e );
		}
	});
}

exports = module.exports = ModClass;
