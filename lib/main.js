const winston = require('winston');
const Fs = require('fs');
const Promise = require("promised-io/promise").Promise;
const PromiseSeq = require("promised-io/promise").seq;

const CommandsClass = require("./commands");
const FilesClass = require("./files");
const ECLsClass = require("./ecls");
const SpraysClass = require("./sprays");
const MySQLImportsClass = require("./mysqlimports");


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
	var oPromise = new Promise();
	var oProcesses = [];
	var that = this;
	winston.log('info', '[%s] Started activity...', pStepId);
	try {
		for (var i in pStep ) {
			var oHandler = this.mHandlers[ i ];
			if ( ! oHandler ) {
				winston.log('error', 'Mod [%s] unknown. Skipping.', i);
			} else {
				oProcesses.push( this._chain_handler( pStepId, pStep[i], oHandler ) );
			}
		}
		PromiseSeq(oProcesses, {}).then( function( pData ) {
			winston.log('info', '[%s] Completed activity.', pStepId);
			oPromise.resolve( pData );
		},  function( pError ) {
			winston.log('error', '[%s] Errors during activity.', pStepId, pError );
			oPromise.reject( pError );
		} );
	} catch (e) {
		oPromise.reject( e );
		winston.log('error', '[%s] Unexpected error during activity.', pStepId, e);
	}
	return oPromise;
}

ModClass.prototype.process = function( pConfig, pParameters ) {
	winston.log('info', 'Starting ETL...', oStepId);
	var oPromise = new Promise();
	var that = this;
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
		PromiseSeq( oStepProcesses, {} ).then( function( pData ) {
			console.log('Done.');
			oPromise.resolve( pData );
		},  function( pError ) {
			console.log('Done (with errors).');
			winston.log('error', 'Unexpected error running steps.', pError );
			oPromise.reject( pError );
		} );
	} catch (e) {
		winston.log('error', 'Unexpected error.', e );
		oPromise.reject( e );
	}
	return oPromise;
}

exports = module.exports = ModClass;