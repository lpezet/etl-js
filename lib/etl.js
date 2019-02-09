const winston = require('winston');
const Fs = require('fs');
const Promises = require('./promises');

/*
const CommandsClass = require("./commands");
const FilesClass = require("./files");
const ECLsClass = require("./ecls");
const SpraysClass = require("./sprays");
const MySQLImportsClass = require("./mysqlimports");
*/

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

ModClass.prototype._chain_handler = function( pStepId, pKey, pStep, pHandler ) {
	var that = this;
	return function( pData ) { 
		try {
			return pHandler.handle( pStepId, pStep, that.mExecutor, pData );
		} catch( e ) {
			winston.log('error', '[%s] Error executing step for [%s].', pStepId, pKey, e );
			throw e;
		}
	};
}

ModClass.prototype._wrap_process = function( pStepId, pStep, pHandler ) {
	var that = this;
	return function( pData ) { 
		winston.log('debug', '[%s] Executing activity...', pStepId );
		try {
			return that._process( pStepId, pStep, pData );
		} catch (e) {
			winston.log('error', '[%s] Error executing activity.', pStepId );
		}
	};
}

ModClass.prototype._process = function( pStepId, pStep, pPreviousStepData ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		var oProcesses = [];
		//winston.log('info', '[%s] Started activity...', pStepId);
		try {
			for (var i in pStep ) {
				var oMod = that.mMods[ i ];
				if ( ! oMod ) {
					winston.log('error', 'Mod [%s] unknown. Skipping.', i);
				} else {
					oProcesses.push( that._chain_handler( pStepId, i, pStep[i], oMod ) );
				}
			}
			//Promises.seqConcatResults( oProcesses ).then( function( pData ) {
			Promises.seq( oProcesses, pPreviousStepData ).then( function( pData ) {
				winston.log('info', '[%s] Completed activity.', pStepId);
				resolve( pData );
			},  function( pError ) {
				winston.log('error', '[%s] Errors during activity.', pStepId, pError );
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
			
			for (var i in oETLSteps) {
				var oStepId = oETLSteps[i];
				var oStep = pConfig[oStepId];
				if ( ! oStep ) {
					//TODO
					winston.log('warn', 'No configuration for activity [%s]. Skipping.', oStepId);
				} else {
					winston.log('debug', 'Encountered activity [%s]...', oStepId);
					oStepProcesses.push( that._wrap_process( oStepId, oStep ) );
				}
			}
			Promises.seq( oStepProcesses, null ).then( function( pData ) {
				console.log('Done.');
				resolve( pData );
			},  function( pError ) {
				console.log('Done (with errors).');
				winston.log('error', 'Unexpected error running activities.', pError );
				reject( pError );
			} );
		} catch (e) {
			winston.log('error', 'Unexpected error.', e );
			reject( e );
		}
	});
}

exports = module.exports = ModClass;