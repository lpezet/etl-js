const winston = require('winston');
const Fs = require('fs');
const CommandsClass = require("./commands");
const FilesClass = require("./files");
const ECLsClass = require("./ecls");
const SpraysClass = require("./sprays");
const MySQLImportsClass = require("./mysqlimports");
const Promises = require('./promises');

var mod_settings = function( pSettings, pMod ) {
	if ( ! pSettings ) return {};
	if ( ! pSettings[ 'mods' ] ) return {};
	if ( ! pSettings[ 'mods' ][ pMod ] ) return {};
	return pSettings[ 'mods' ][ pMod ];
}

ModClass = function( pExecutor, pSettings ) {
	//this.mSettings = pSettings || {};
	this.mHandlers = { 
			"files": new FilesClass( mod_settings( pSettings, 'files' ) ),
			"commands": new CommandsClass( mod_settings( pSettings, 'commands' ) ),
			"sprays": new SpraysClass( mod_settings( pSettings, 'sprays' ) ),
			"ecls": new ECLsClass( mod_settings( pSettings, 'ecls' )),
			"mysqlimports": new MySQLImportsClass( mod_settings( pSettings, 'mysqlimports' ))
	};
	this.mExecutor = pExecutor;
	
}

ModClass.prototype._chain_handler = function( pStepId, pStep, pHandler ) {
	var that = this;
	return function() { 
		try {
			return pHandler.handle( pStepId, pStep, that.mExecutor );
		} catch( e ) {
			winston.log('error', '[%s] Error executing step.', pStepId, e );
			throw e;
		}
	};
}

ModClass.prototype._wrap_process = function( pStepId, pStep, pHandler ) {
	var that = this;
	return function() { 
		winston.log('debug', '[%s] Executing step...', pStepId );
		try {
			return that._process( pStepId, pStep );
		} catch (e) {
			winston.log('error', '[%s] Error executing step.', pStepId );
		} finally {
			winston.log('debug', '[%s] Done executing step.', pStepId );
		}
	};
}

ModClass.prototype._process = function( pStepId, pStep ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		var oProcesses = [];
		winston.log('info', '[%s] Started activity...', pStepId);
		try {
			for (var i in pStep ) {
				var oHandler = that.mHandlers[ i ];
				if ( ! oHandler ) {
					winston.log('error', 'Mod [%s] unknown. Skipping.', i);
				} else {
					oProcesses.push( that._chain_handler( pStepId, pStep[i], oHandler ) );
				}
			}
			Promises.seqConcatResults( oProcesses ).then( function( pData ) {
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
					winston.log('warn', 'No configuration for step [%s]. Skipping.', oStepId);
				} else {
					winston.log('debug', 'Encountered step [%s]...', oStepId);
					oStepProcesses.push( that._wrap_process( oStepId, oStep ) );
				}
			}
			Promises.seqConcatResults( oStepProcesses, {} ).then( function( pData ) {
				console.log('Done.');
				resolve( pData );
			},  function( pError ) {
				console.log('Done (with errors).');
				winston.log('error', 'Unexpected error running steps.', pError );
				reject( pError );
			} );
		} catch (e) {
			winston.log('error', 'Unexpected error.', e );
			reject( e );
		}
	});
}

exports = module.exports = ModClass;