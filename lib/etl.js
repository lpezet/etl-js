const EventEmitter = require('events').EventEmitter;
const util = require('util');
const Promises = require('./promises');
const SimpleLogger = require('./logger');

var mod_settings = function( pSettings, pMod ) {
	if ( ! pSettings ) return {};
	if ( ! pSettings[ 'mods' ] ) return {};
	if ( ! pSettings[ 'mods' ][ pMod ] ) return {};
	return pSettings[ 'mods' ][ pMod ];
}

ModClass = function( pExecutor, pSettings, pLogger ) {
	this.mSettings = pSettings || {};
	this.mMods = {};
	this.mExecutor = pExecutor;
	this.mLogger = pLogger || new SimpleLogger({ level: 'info' });
}

util.inherits(ModClass, EventEmitter);

ModClass.prototype.get_mods = function() {
	return this.mMods;
}

ModClass.prototype.mod = function( pKey, pSource, pCallback ) {
	if( this.mMods[ pKey ] ) throw "Mod for " + pKey + " already registered.";
	this.mMods[ pKey ] = pSource; //pFn.bind( pSource );
	if ( pCallback ) pCallback( mod_settings( this.mSettings, pKey ), this.mLogger );
}

ModClass.prototype._chain_handler = function( pStepId, pKey, pStep, pHandler, pContext ) {
	var that = this;
	return function( pData ) { 
		try {
			return pHandler.handle( pStepId, pStep, that.mExecutor, pData, pContext );
		} catch( e ) {
			that.mLogger.error('[%s] Error executing step for [%s].', pStepId, pKey, e );
			throw e;
		}
	};
}

ModClass.prototype._wrap_process = function( pStepId, pStep, pContext ) {
	var that = this;
	return function( pData ) { 
		that.mLogger.debug('[%s] Executing activity...', pStepId );
		if ( pData['_exit'] ) {
			//TODO: log exit behavior here. Use _exit_from to log which section triggered exit.
			return Promise.resolve( pData ); //TODO: resolve?
		} else {
			try {
				return that._process( pStepId, pStep, pData, pContext );
			} catch (e) {
				that.mLogger.error('[%s] Error executing activity.', pStepId );
				return Promise.reject( e ); //TODO: check e
			}
		}
	};
}

ModClass.prototype._process = function( pStepId, pStep, pPreviousStepData, pContext ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		var oProcesses = [];
		try {
			//
			//TODO: Rename pPreviousStepData into pContext
			//pPreviousStepData[ pStepId ] = {};
			
			for (var i in pStep ) {
				var oMod = that.mMods[ i ];
				if ( ! oMod ) {
					that.mLogger.error('Mod [%s] unknown. Skipping.', i);
				} else {
					oProcesses.push( that._chain_handler( pStepId, i, pStep[i], oMod, pContext ) );
				}
			}
			Promises.seq( oProcesses, pPreviousStepData ).then( function( pData ) {
				that.mLogger.info('[%s] Completed activity.', pStepId);
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
				that.emit('activityDone', pStepId, null, pData );
				resolve( pData );
			},  function( pError ) {
				that.mLogger.error('[%s] Errors during activity.', pStepId, pError );
				//console.log('etl._process: (3) pDataResults = ' + pDataResults);
				pContext[ pStepId ] = pError;
				that.emit('activityDone', pStepId, pError, null );
				reject( pError );
			} );
		} catch (e) {
			reject( e );
			that.mLogger.error('[%s] Unexpected error during activity.', pStepId, e);
		}
	});
}

ModClass.prototype.process = function( pConfig, pParameters ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		that.mLogger.info('Starting ETL...');
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
					that.mLogger.warn('No configuration for activity [%s]. Skipping.', oStepId);
				} else {
					that.mLogger.debug('Encountered activity [%s]...', oStepId);
					oStepProcesses.push( that._wrap_process( oStepId, oStep, oData ) );
				}
			}
			Promises.seq( oStepProcesses, {} ).then( function( pData ) {
				resolve( oData );
			},  function( pError ) {
				reject( oData );
			} );
		} catch (e) {
			that.mLogger.error('Unexpected error.', e );
			reject( e );
		}
	});
}

exports = module.exports = ModClass;
