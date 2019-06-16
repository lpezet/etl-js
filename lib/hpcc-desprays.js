const Promises = require('./promises');
const SimpleLogger = require('./logger');
const TemplateEngine = require('./templating/engine');

var logger = new SimpleLogger({ level: 'info' });

//var re_escape = function( pValue ) {
//	if ( pValue.indexOf("\\") < 0 ) return pValue;
//	return pValue.replace('/\\/g', '\\\\');
//}

var asPromised = function( pPreviousData, pKey, func, data) {
	if ( ! pPreviousData['hpcc-desprays'][pKey] ) pPreviousData['hpcc-desprays'][pKey] = {};
	pPreviousData['hpcc-desprays'][pKey] = data;
	//if ( data['exit'] ) {
	//	pPreviousData['_exit'] = data['exit'];
	//	pPreviousData['_exit_from'] = pKey;
	//}
	func( pPreviousData );
}

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'hpcc-desprays', this, function( pSettings, pLogger ) {
		that.mSettings = pSettings;
		if ( pLogger ) logger = pLogger;
	});
	this.mTemplateEngine = new TemplateEngine();
};

ModClass.prototype._evaluate = function( pTemplate, pContext ) {
	//TODO: Not sure I want to do this. This would make "files" handling "context" that might be different than other mods.
	//For example, "files" might accept $._current and others may not. Best if using path in template is the same across everything.
	// Having said that, a mod then cannot access the results of another mod within the same activity...
	
	/*
	var oContext = JSON.parse(JSON.stringify(pContext.global));
	oContext['_current'] = JSON.parse(JSON.stringify(pContext.local));
	console.log('Merged context=');
	console.dir( oContext );
	var oResult = this.mTemplateEngine.evaluate( pTemplate, oContext );
	console.log('Result=');
	console.dir( oResult );
	*/
	return this.mTemplateEngine.evaluate( pTemplate, pContext );
};

ModClass.prototype._despray_error = function( pParent, pKey ) {
	return function( pPreviousData ) {
		var data = { error: 'Must specify destination destinationPath and destinationIP or destinationXML for [' + pKey + '].', result: null, message: null, exit: false, pass: true, _stdout: null, _stderr: null  };
		logger.error('[%s] Must specify destination destinationPath and destinationIP or destinationXML for [%s].', pParent, pKey);
		return Promise.reject( data );
	}
};

ModClass.prototype._despray = function( pParent, pKey, pConfig, pExecutor, pContext ) {
	logger.debug('[%s] Despraying to [%s]...', pParent, (pConfig ? pConfig.destinationpath: 'NA'));
	var that = this;
	return function( pPreviousData ) {
		return new Promise( function( resolve, reject ) {
			try {
				var safe_parse_int = function( pValue, pDefault ) {
					try {
						return parseInt( pValue );
					} catch (e) {
						return pDefault;
					}
				};
				
				var zero_one = function( pValue ) {
					if ( pValue === true || pValue === "1" ) return "1";
					return "0";
				}
				var oCmdArgs = [];
				oCmdArgs.push("action=despray");
				
				const ATTRS = { 
						//"espserveripport": true
						"logicalname": true, "destinationip": true, "destinationpath": true, "destinationxml": true, 
						"allowoverwrite": true, "server": true, "username": true, "password": true, "compress": true,
						"maxconnections": true, "timeout": true,  "allowoverwrite": true, "replicate": true,
						"splitprefix": true
				};
				
				for ( var k in pConfig ) {
					k = new String(k).toLowerCase();
					
					if ( ! ATTRS[k] ) {
						logger.warn('[%s] Unrecognized property %s for [%s]. Skipping it.', pParent, k, pKey);
						continue;
					}
					
					switch ( k ) {
						//case "espserveripport": // this is from ECL SprayDelimited documentation, not from dfuplus...
						case "server":
							if (pConfig[k]) oCmdArgs.push( "server=" + pConfig[k]);
							break;
						case "username":
							if (pConfig[k]) oCmdArgs.push( "username=" + pConfig[k]);
							break;
						case "password":
							if (pConfig[k]) oCmdArgs.push( "password=" + pConfig[k]);
							break;
						case "logicalname":
							if (pConfig[k]) oCmdArgs.push( "srcname=" + pConfig[k]);
							break;
						case "destinationip":
							if (pConfig[k]) oCmdArgs.push( "dstip=" + pConfig[k]);
							break;
						case "destinationpath":
							if ( pConfig[k] ) {
								var oSrcPath = pConfig[k];
								//console.log('srcPath=' + oSrcPath);
								oSrcPath = oSrcPath.indexOf("{{") < 0 ? oSrcPath: that._evaluate( oSrcPath, pContext );
								oCmdArgs.push( "dstfile=" + oSrcPath);
							}
							break;
						case "destinationxml":
							if (pConfig[k]) oCmdArgs.push( "dstxml=" + pConfig[k]);
							break;
						case "maxconnections":
							if (pConfig[k]) oCmdArgs.push( "connect=" + pConfig[k]);
							break;
						case "timeout":
							var oTimeoutValue = safe_parse_int( pConfig[k], -999);
							if ( oTimeoutValue === 0 ) oCmdArgs.push( "nowait=1");
							else oCmdArgs.push( "nowait=0");
							break;
						case "allowoverwrite":
							oCmdArgs.push( "overwrite=" + zero_one(pConfig[k]));
							break;
						case "replicate":
							oCmdArgs.push( "replicate=" + zero_one(pConfig[k]));
							break;
						case "compress":
							oCmdArgs.push( "compress=" + zero_one(pConfig[k]));
							break;
						case "splitprefix":
							if (pConfig[k]) oCmdArgs.push( "splitprefix=" + pConfig[k]);
							break;
						default:
							logger.warn('[%s] Skipping property [%s]. Not supported.', pParent, k);
							break;
					}
				}
				var oCmdOptions = {};
					
				var oCmd = "/usr/bin/dfuplus " + oCmdArgs.join(' ');
				pExecutor.exec( oCmd, oCmdOptions, function( error, stdout, stderr ) {
					var data = { error: error, result: null, message: null, exit: false, pass: true, _stdout: stdout, _stderr: stderr  };
					var func = null;
					
					if ( error ) {
						logger.error('[%s] Error while executing despraying command. Exit code = %s, error = %s', pParent, error.code, error);
						//reject( error );
						func = reject;
						data.result = data._stderr;
					} else {
						//resolve();
						func = resolve;
						data.result = data._stdout;
					}
					
					asPromised( pPreviousData, pKey, func, data );
				});
			} catch( e ) {
				var data = { error: e, result: null, message: null, exit: false, pass: true, _stdout: null, _stderr: null  };
				logger.error('[%s] Unexpected error despraying', e );
				asPromised( pPreviousData, pKey, reject, data );
			}
		});
	};
};

ModClass.prototype._read_config = function( pParent, pKey, pConfig ) {
	var oDefaults = {
		logicalname: null,
		destinationip: null,
		destinationpath: null,
		destinationxml: null,
		splitprefix: null,
		timeout: -1,
		//espserveripport: null,
		maxconnections: 25,
		allowoverwrite: "0",
		replicate: "1",
		compress: "0"
	}
	
	// WARNING: defaults will be affected here, don't make it a global thing, or change logic here, by first copying defaults into empty object.
	var oConfig = oDefaults;
	for (var i in pConfig) {
		oConfig[ i.toLowerCase() ] = pConfig[i];
	}
	
	var apply_settings = function( pConfig, pSettings ) {
		if ( ! pConfig['server'] && pSettings['server'] ) {
			pConfig['server'] = pSettings['server'];
		}
		if ( ! pConfig['username'] && pSettings['username'] ) {
			pConfig['username'] = pSettings['username'];
		}
		if ( ! pConfig['password'] && pSettings['password'] ) {
			pConfig['password'] = pSettings['password'];
		}
	}
	
	
	if ( this.mSettings[ pKey ] ) apply_settings( oConfig, this.mSettings[ pKey ] );
	else if ( this.mSettings[ pParent ] ) apply_settings( oConfig,this.mSettings[ pParent ] );
	else if ( this.mSettings[ '*' ] ) apply_settings( oConfig, this.mSettings[ '*' ] );
	
	return oConfig;
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pContext ) { //pCurrentActivityResult, pGlobalResult, pContext ) {
	//var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
	var that = this;
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] Processing hpcc-despray...', pParent);
		try {
			var oData = { 'hpcc-desprays' : {} };
			var oPromises = [];
			
			for (var i in pConfig) {
				var oLogicalFileName = i;
				oLogicalFileName = oLogicalFileName.indexOf("{{") < 0 ? oLogicalFileName: that._evaluate( oLogicalFileName, pContext );
				 
				var oDesprayConfig = that._read_config( pParent, i, pConfig[i] );
				if ( ! oDesprayConfig.logicalname ) oDesprayConfig.logicalname = oLogicalFileName;
				
				if ( (! oDesprayConfig.destinationpath || ! oDesprayConfig.destinationip) && ! oDesprayConfig.destinationxml ) {
					oPromises.push( that._despray_error( pParent, oLogicalFileName ) );
				} else {
					oPromises.push( that._despray( pParent, oLogicalFileName, oDesprayConfig, pExecutor, pContext ) );
				}
			}
			Promises.seq( oPromises, oData ).then(function( pData ) {
				logger.debug('[%s] Done processing hpcc-despray.', pParent);
				resolve( oData );
			}, function( pError ) {
				logger.error('[%s] Unexpected error in hpcc-despray.', pParent, pError);
				reject( pError );
			});
		} catch (e) {
			logger.error('[%s] Unexpected error processing step.', pParent, e);
			reject( e );
		}
	});
}

exports = module.exports = ModClass;
