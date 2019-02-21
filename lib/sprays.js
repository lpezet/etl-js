const winston = require('winston');
const Fs = require('fs');
const Promises = require('./promises');

var re_escape = function( pValue ) {
	if ( pValue.indexOf("\\") < 0 ) return pValue;
	return pValue.replace('/\\/g', '\\\\');
}

var asPromised = function( pPreviousData, pKey, func, data) {
	if ( ! pPreviousData.sprays[pKey] ) pPreviousData.sprays[pKey] = {};
	pPreviousData.sprays[pKey] = data;
	if ( data['exit'] ) {
		pPreviousData['_exit'] = data['exit'];
		pPreviousData['_exit_from'] = pKey;
	}
	/*
	if ( result ) {
		pPreviousData[pKey]['result'] = result;
	}
	if ( error ) {
		pPreviousData[pKey]['error'] = error;
	}
	*/
	//console.log('asPromised:');
	//console.dir( pPreviousData );
	func( pPreviousData );
}

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'sprays', this, function( pSettings ) {
		that.mSettings = pSettings;
	});
}

ModClass.prototype._spray_error = function( pParent, pKey ) {
	return function( pPreviousData ) {
		var data = { error: 'Must specify spray format (fixed|csv|delimited|xml|recfmv|recfmb) for file [' + pKey + '].', result: null, message: null, exit: false, pass: true, _stdout: null, _stderr: null  };
		winston.log('error', '[%s] Must specify spray format (fixed|csv|delimited|xml|recfmv|recfmb) for file [%s].', pParent, pKey);
		return Promise.reject( data );
		/*
		return new Promise( function( resolve, reject ) {
			winston.log('error', '[%s] Must specify spray format (fixed|csv|delimited|xml|recfmv|recfmb) for file [%s].', pParent, pKey);
			reject( 'Must specify spray format (fixed|csv|delimited|xml|recfmv|recfmb) for file [' + pKey + '].' );
		});
		*/
	}
}

ModClass.prototype._spray_fixed = function( pParent, pKey, pSprayConfig, pExecutor ) {
	return function() {
		return new Promise( function( resolve, reject ) {
			var data = { error: 'Spray fixed is not yet supported.', result: null, message: null, exit: false, pass: true, _stdout: null, _stderr: null  };
			winston.log('error', '[%s] Spray fixed is not yet supported.', pParent);
			reject( data );
		});
	}
}

ModClass.prototype._spray_xml = function( pParent, pKey, pSprayConfig, pExecutor ) {
	return function( pPreviousData ) {
		return new Promise( function( resolve, reject ) {
			var data = { error: 'Spray fixed is not yet supported.', result: null, message: null, exit: false, pass: true, _stdout: null, _stderr: null  };
			winston.log('error', '[%s] Spray xml is not yet supported.', pParent);
			reject( data );
		});
	}
	
}

ModClass.prototype._spray_delimited = function( pParent, pKey, pSprayConfig, pExecutor ) {
	winston.log('debug', '[%s] Spraying delimited to [%s]...', pParent, (pSprayConfig ? pSprayConfig.destinationlogicalname: 'NA'));
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
					if ( pValue == true || pValue == "1" ) return "1";
					return "0";
				}
				var oCmdArgs = [];
				oCmdArgs.push("action=spray");
				
				const DEFAULT_ATTRS = { 
						//, "sourceip": true, , "espserveripport": true,
						"destinationgroup": true, "destinationlogicalname": true, "sourcepath": true, "format": true, "server": true, 
						"username": true, "password": true, "maxconnections": true, "timeout": true,  "allowoverwrite": true, 
						"replicate": true, "compress": true, "failifnosourcefile": true, "expiredays": true };
				
				const CSV_ATTRS = { "quotedterminator": true, "recordstructurepresent": true, 
						"encoding": true, "srccsvseparator": true, "srccsvterminator": true, 
						"srccsvquote": true, "sourcecsvescape": true, "maxrecordsize": true };
				for ( var k in pSprayConfig ) {
					if ( ! DEFAULT_ATTRS[k] && ! CSV_ATTRS[k] ) continue;
					//if ( ! pSprayConfig[k] ) continue; //TODO: sure?
					
					switch ( k ) {
						//case "espserveripport": // this is from ECL SprayDelimited documentation, not from dfuplus...
						case "server":
							oCmdArgs.push( "server=" + pSprayConfig[k]);
							break;
						case "username":
							oCmdArgs.push( "username=" + pSprayConfig[k]);
							break;
						case "password":
							oCmdArgs.push( "password=" + pSprayConfig[k]);
							break;
						case "sourceip":
							oCmdArgs.push( "srcip=" + pSprayConfig[k]);
							break;
						case "sourcepath":
							oCmdArgs.push( "srcfile=" + pSprayConfig[k]);
							break;
						case "format":
							oCmdArgs.push( "format=" + pSprayConfig[k]);
							break;
						case "maxconnections":
							oCmdArgs.push( "connect=" + pSprayConfig[k]);
							break;
						case "timeout":
							var oTimeoutValue = safe_parse_int( pSprayConfig[k], -999);
							if ( oTimeoutValue == 0 ) oCmdArgs.push( "nowait=1");
							else oCmdArgs.push( "nowait=0");
							break;
						case "destinationlogicalname":
							oCmdArgs.push( "dstname=" + pSprayConfig[k]);
							break;
						case "destinationgroup":
							oCmdArgs.push( "dstcluster=" + pSprayConfig[k]);
							break;
						case "allowoverwrite":
							oCmdArgs.push( "overwrite=" + zero_one(pSprayConfig[k]));
							break;
						case "replicate":
							oCmdArgs.push( "replicate=" + zero_one(pSprayConfig[k]));
							break;
						case "compress":
							oCmdArgs.push( "compress=" + zero_one(pSprayConfig[k]));
							break;
						case "failifnosourcefile":
							oCmdArgs.push( "failifnosourcefile=" + zero_one(pSprayConfig[k]));
							break;
						case "expiredays":
							oCmdArgs.push( "expiredays=" + pSprayConfig[k]);
							break;
						case "quotedterminator":
							oCmdArgs.push( "quotedTerminator=" + zero_one(pSprayConfig[k]));
							break;
						case "recordstructurepresent":
							oCmdArgs.push( "recordstructurepresent=" + zero_one(pSprayConfig[k]));
							break;
						case "encoding":
							oCmdArgs.push( "encoding=" + pSprayConfig[k]);
							break;
						case "srccsvseparator":
							oCmdArgs.push( "srccsvseparator=" + re_escape(pSprayConfig[k]));
							break;
						case "srccsvterminator":
							oCmdArgs.push( "srccsvterminator=" + re_escape(pSprayConfig[k]));
							break;
						case "srccsvquote":
							oCmdArgs.push( "quote=\\" + pSprayConfig[k]); //TODO: is that right to escape here?
							break;
						case "maxrecordsize":
							oCmdArgs.push( "maxrecordsize=" + pSprayConfig[k]);
							break;
						case "sourcecsvescape":
							oCmdArgs.push( "escape=" + pSprayConfig[k]);
							break;
						default:
							winston.log('warn', '[%s] Skipping property [%s]. Not supported for delimited.', pParent, k);
							break;
					}
				}
				var oCmdOptions = {};
					
				var oCmd = "/usr/bin/dfuplus " + oCmdArgs.join(' ');
				pExecutor.exec( oCmd, oCmdOptions, function( error, stdout, stderr ) {
					var data = { error: error, result: null, message: null, exit: false, pass: true, _stdout: stdout, _stderr: stderr  };
					var func = null;
					
					if ( error ) {
						winston.log('error', '[%s] Error while executing spraying command. Exit code = %s, error = %s', pParent, error.code, error);
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
				winston.log('error', '[%s] Unexpected error spraying delimited', e );
				asPromised( pPreviousData, reject, func, data );
			}
		});
	};
};

ModClass.prototype._read_config = function( pParent, pKey, pConfig ) {
	var oDefaults = {
		format: null,
		//sourceip: null,
		sourcepath: null,
		maxrecordsize: 8192,
		srccsvseparator: '\\,',
		srccsvterminator: '\\n,\\r\\n',
		srccsvquote: "'",
		destinationgroup: null,
		destinationlogicalname: null,
		timeout: -1,
		//espserveripport: null,
		maxconnections: 25,
		allowoverwrite: "0",
		replicate: "1",
		compress: "0",
		sourcecsvescape: null,
		failifnosourcefile: "1",
		recordstructurepresent: "0",
		quotedterminator: "1",
		encoding: "utf8",
		expiredays: ''
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

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pData ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		winston.log('debug', '[%s] Processing spray...', pParent);
		try {
			var oData = { 'sprays' : {} };
			var oPromises = [];
			
			for (var i in pConfig) {
				var oLogicalFileName = i;
				var oSprayConfig = that._read_config( pParent, i, pConfig[i] );
				if ( ! oSprayConfig.destinationlogicalname ) oSprayConfig.destinationlogicalname = oLogicalFileName;
				if ( ! oSprayConfig.format ) {
					oPromises.push( that._spray_error( pParent, oLogicalFileName ) );
				} else {
					switch ( oSprayConfig.format ) {
						case "delimited":
						case "csv":
							oPromises.push( that._spray_delimited( pParent, oLogicalFileName, oSprayConfig, pExecutor ) );
							break;
						case "fixed":
							oPromises.push( that._spray_fixed( pParent, oLogicalFileName, oSprayConfig, pExecutor ) );
							break;
						case "xml":
							oPromises.push( that._spray_xml( pParent, oLogicalFileName, oSprayConfig, pExecutor ) );
							break;
						default:
							winston.log('error', '[%s] Spray format [%s] not supported.', pParent, oSprayConfig.format);
							break;
					}
				}
			}
			Promises.seq( oPromises, oData ).then(function( pData ) {
				winston.log('debug', '[%s] Done processing spray.', pParent);
				//resolve( pData );
				resolve( oData );
			}, function( pError ) {
				winston.log('error', '[%s] Unexpected error spraying.', pParent, pError);
				reject( pError );
				
			});
		} catch (e) {
			winston.log('error', '[%s] Unexpected error processing step.', pParent, e);
			reject( e );
		}
	});
}



exports = module.exports = ModClass;