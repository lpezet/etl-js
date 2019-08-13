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

ModClass.prototype._step_process = function( pActivityId, pKey, pStep, pHandler, pResults, pContext ) {
	var that = this;
	// pCurrentActivityData: { exit: true|false, skip: true|false, steps: {} }
	return function( pCurrentActivityData ) { 
		try {
			if ( pCurrentActivityData && (pCurrentActivityData['skip'] || pCurrentActivityData['exit']) ) {
				that.mLogger.debug('[%s] Skipping step %s.', pActivityId, pKey);
				return Promise.resolve( pCurrentActivityData );
			} else {
				//console.log('## etl: Returning handle() for ' + pActivityId);
				that.mLogger.debug('[%s] Executing step %s...', pActivityId, pKey);
				return new Promise( function( resolve, reject ) {
				//return	
					pHandler.handle( pActivityId, pStep, that.mExecutor, pContext ) // pCurrentActivityData, pResults, pContext )
					.then(function( pData ) {
						//console.log('######## handle!!!!');
						//console.log( JSON.stringify( pData ) );
						pData = pData || {};
						pCurrentActivityData.skip = pCurrentActivityData.skip || Boolean( pData['skip'] );
						pCurrentActivityData.exit = pCurrentActivityData.exit || Boolean( pData['exit'] );
						//pCurrentActivityData.results.push( { step: pKey, results: pData } );
						pCurrentActivityData.steps[ pKey ] = pData  ;
						//console.log('######## handle end!!!!');
						resolve( pCurrentActivityData );
					}, function( pError ) {
						reject( pError ); ///????
					});
				});
			}
		} catch( e ) {
			that.mLogger.error('[%s] Error executing step for [%s].', pActivityId, pKey, e );
			throw e;
		}
	};
}

var EXIT_OR_SKIP_CONDITION = function( pValue, pChainName ) {
	//console.log('##########EXIT_OR_SKIP_CONDITION: Chain=%s, pValue=%j', pChainName, pValue);
	//return pValue && (pValue['skip'] || pValue['exit']);
	return false;
}

ModClass.prototype._wrap_activity_process = function( pStepIndex, pTotalSteps, pActivityId, pStep, pResults, pContext ) {
	var that = this;
	return function( pData ) { 
		that.mLogger.info('[%s] Executing activity (%s/%s)...', pActivityId, pStepIndex, pTotalSteps );
		that.mLogger.debug('[%s] Checking to exit: [%s]', pActivityId, pData['exit']);
		//console.log('######## _wrap_activity_process!!!! : ');
		//console.log( JSON.stringify( pData ) );
		if ( pData['exit'] ) {
			that.mLogger.debug('[%s] Exiting (skipping)...', pActivityId);
			//TODO: log exit behavior here. Use _exit_from to log which section triggered exit.
			return Promise.resolve( pData ); //TODO: resolve?
		} else {
			try {
				return that._activity_process( pStepIndex, pTotalSteps, pActivityId, pStep, pData, pResults, pContext );
			} catch (e) {
				that.mLogger.error('[%s] Error executing activity.', pActivityId );
				return Promise.reject( e ); //TODO: check e
			}
		}
	};
}

ModClass.prototype._activity_process = function( pActivityIndex, pTotalActivities, pActivityId, pActivity, pPreviousActivityData, pResults, pContext ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		var oProcesses = [];
		try {
			/*
			var oResult = {
				exit: false,
				skip: false,
				steps: {}
			}
			*/
			//
			//TODO: Rename pPreviousStepData into pContext
			//pPreviousStepData[ pActivityId ] = {};
			
			for (var i in pActivity ) {
				var oMod = that.mMods[ i ];
				that.mLogger.debug('[%s] Encountered [%s]...', pActivityId, i);
				//console.log('## etl: Activity ' + pActivityId + ' mod=' + i);
				if ( ! oMod ) {
					that.mLogger.error('[%s] ...mod [%s] unknown. Skipping.', pActivityId, i);
				} else {
					that.mLogger.debug('[%s] ...adding mod [%s] to chain...', pActivityId, i);
					oProcesses.push( that._step_process( pActivityId, i, pActivity[i], oMod, pResults, pContext ) );
				}
			}
			//Promises.seq( oProcesses, pPreviousActivityData )
			
			Promises.chain( oProcesses, 
					{
						exit: false,
						skip: false,
						steps: {}
					}
					//pPreviousActivityData
					, EXIT_OR_SKIP_CONDITION, { name: "activities", logger: that.mLogger })
			.then( function( pData ) {
				//console.log('############ chained !!!!!');
				that.mLogger.info('[%s] Activity completed (%s/%s).', pActivityId, pActivityIndex, pTotalActivities);
				that.mLogger.info('[%s] Activity results: %j', pActivityId, pData);
				//console.log(' pData=' );
				//console.log( JSON.stringify( pData ) );
				
				/*
				console.log('etl._process: (2) pPreviousStepData = ');
				console.log(util.inspect(pPreviousStepData, false, null, true))
				console.log('etl._process: (2) pDataResults = ');
				console.log(util.inspect(pDataResults, false, null, true))
				console.log('etl._process: (2) pData = ');
				console.log(util.inspect(pData, false, null, true))
				*/
				
				//TODO: no need then:
				var oResult = { activity: pActivityId, steps: pData['steps'], exit: Boolean(pData['exit']), skip: Boolean(pData['skip'])};
				if ( pData['exit'] ) pResults.exit = pData['exit'];
				pResults.activities.push( oResult );
				//pResult[ pActivityId ] = pData;
				//TODO: replace with:
				//resolve( pPreviousStepData );
				that.emit('activityDone', pActivityId, null, pData, pActivityIndex, pTotalActivities );
				resolve( oResult );
			},  function( pError ) {
				that.mLogger.error('[%s] Errors during activity.', pActivityId, pError );
				//console.log('etl._process: (3) pDataResults = ' + pDataResults);
				//pContext[ pActivityId ] = pError; //TODO:????
				var oResult = { activity: pActivityId, error: pError };
				pResults.activities.push( oResult );
				
				that.emit('activityDone', pActivityId, pError, null, pActivityIndex, pTotalActivities );
				reject( pError );
			} );
		} catch (e) {
			reject( e );
			that.mLogger.error('[%s] Unexpected error during activity.', pActivityId, e);
		}
	});
}

ModClass.prototype._resolve_etlsets = function( pETLs ) {
	var oStack = [];
	for (var i in pETLs ) {
		oStack.push( { key: i, value: pETLs[i], tries: 0 });
	}
	var s = null;
	var oResolved = {};
	while( oStack.length > 0 ) {
		s = oStack.shift();
		var k = s.key;
		//console.log('## Working on: ' + k);
		var v = s.value;
		var nv = []; // new values
		var oResolveLater = false;
		for (var i in v) {
			var oVal = v[i];
			var oValType = typeof( oVal );
			switch( oValType ) {
    			case 'string':
    				nv.push( oVal );
    				break;
    			case 'object':
    				var oRef = oVal['etlSet'];
    				//TODO: throw error if not present
    				if ( !oResolved[oRef] ) {
    					//console.log( 'Need to resolve later: ' + k);
    					if ( s.tries > 5 ) {
    						throw new Error('Infinite loop detected with (at least) entry [' + k + '].');
    					}
    					s.tries++;
    					oStack.push( s ); // resolve it later
    					oResolveLater = true;
    				} else {
    					nv = nv.concat( oResolved[oRef] );
    				}
    				break;
    			default:
    				throw new Error(k + ': value type ' + oValType + ' not supported.');
			}
			if ( oResolveLater ) break;
		}
		if ( !oResolveLater ) {
			//console.log('### Resolved ' + k);
			oResolved[ k ] = nv;
		}
	}
	return oResolved;
}


ModClass.prototype._resolve_activities = function( pConfig, pParameters ) {
	if ( pConfig["etl"] ) return pConfig["etl"];
	if ( !pConfig["etlSets"] ) throw new Error('Either etl or etlSets (+ "etlSet" param) must be provided in template.');
	var oResolvedETLs = this._resolve_etlsets( pConfig["etlSets"] );
	return oResolvedETLs[ pParameters['etlSet'] ];
}

ModClass.prototype.process = function( pConfig, pParameters ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		that.mLogger.info('Starting ETL...');
		try {
			var oResult = { 
				exit: false,
				activities: []
			};		
			var oETLActivities = that._resolve_activities( pConfig, pParameters );
			if ( !oETLActivities ) {
				that.mLogger.warn('Nothing to run.');
				resolve( oResult );
				return;
			}
			const oTotalActivities = oETLActivities.length;
			var oActivityProcesses = [];
			var oContext = { env: {}, vars: {} };
			for (i in process.env) {
				oContext.env[i] = process.env[i];
			}
			for (var i =0; i < oETLActivities.length; i++) {
				var oActivityId = oETLActivities[i];
				var oActivity = pConfig[oActivityId];
				//console.log('### etl: activity=' + oETLActivities[i]);
				if ( ! oActivity ) {
					//TODO
					that.mLogger.warn('No configuration for activity [%s] (%s/%s). Skipping.', oActivityId, i+1, oTotalActivities);
				} else {
					that.mLogger.debug('Encountered activity [%s]...', oActivityId);
					//console.log('## etl: Activity found: ' + oActivityId);
					oActivityProcesses.push( that._wrap_activity_process( i+1, oTotalActivities, oActivityId, oActivity, oResult, oContext ) );
				}
			}
			//Promises.seq( oStepProcesses, {} )
			//console.log('####### oStepProcesses = ' + oActivityProcesses.length);
			Promises.chain( oActivityProcesses, {}, EXIT_OR_SKIP_CONDITION, { name: "steps", logger: that.mLogger })
			.then( function( pData ) {
				//console.log('##### Final result: ');
				//console.log( JSON.stringify( oResult ) );
				resolve( oResult );
			},  function( pError ) {
				that.mLogger.error('Errors during ETL process: [%j]', pError);
				reject( oResult );
			} );
		} catch (e) {
			that.mLogger.error('Unexpected error.', e );
			reject( e );
		}
	});
}

exports = module.exports = ModClass;
