const winston = require('winston');
const Fs = require('fs');
const Promise = require("promised-io/promise").Promise;
const PromiseSeq = require("promised-io/promise").seq;


var re_escape = function( pValue ) {
	if ( pValue.indexOf("\\") < 0 ) return pValue;
	return pValue.replace('/\\/g', '\\\\');
}

ModClass = function( pSettings ) {
	this.mSettings = pSettings || {};
}

ModClass.prototype._spray_error = function( pParent, pKey ) {
	return function() {
		var oPromise = new Promise();
		winston.log('error', '[%s] Must specify spray format (fixed|csv|delimited|xml|recfmv|recfmb) for file [%s].', pParent, pKey);
		oPromise.reject( 'Must specify spray format (fixed|csv|delimited|xml|recfmv|recfmb) for file [' + pKey + '].' );
		return oPromise;
	}
}

ModClass.prototype._spray_fixed = function( pParent, pSprayConfig, pExecutor ) {
	return function() {
		var oPromise = new Promise();
		winston.log('error', '[%s] Spray fixed is not yet supported.', pParent);
		oPromise.reject( 'Spray fixed is not yet supported.' );
		return oPromise;
	}
}

ModClass.prototype._spray_xml = function( pParent, pSprayConfig, pExecutor ) {
	return function() {
		var oPromise = new Promise();
		winston.log('error', '[%s] Spray xml is not yet supported.', pParent);
		oPromise.reject( 'Spray fixed is not yet supported.' );
		return oPromise;
	}
	
}

ModClass.prototype._spray_delimited = function( pParent, pSprayConfig, pExecutor ) {
	winston.log('debug', '[%s] Spraying delimited to [%s]...', pParent, (pSprayConfig ? pSprayConfig.destinationlogicalname: 'NA'));
	return function() {
		var oPromise = new Promise();
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
			var oProcess = pExecutor.exec( oCmd, oCmdOptions, function( error, stdout, stderr ) {
				if ( error ) {
					winston.log('error', '[%s] Error while executing spraying command. Exit code = %s, error = %s', pParent, error.code, error);
					oPromise.reject( error );
				} else {
					oPromise.resolve();
				}
			});
				
			
		} catch( e ) {
			winston.log('error', '[%s] Unexpected error spraying delimited', e );
			oPromise.reject( e );
		}
		return oPromise;
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

ModClass.prototype.handle = function( pParent, pConfig, pExecutor ) {
	var oPromise = new Promise();
	winston.log('debug', '[%s] Processing spray...', pParent);
	
	try {
		var oPromises = [];
		
		for (var i in pConfig) {
			var oLogicalFileName = i;
			var oSprayConfig = this._read_config( pParent, i, pConfig[i] );
			if ( ! oSprayConfig.destinationlogicalname ) oSprayConfig.destinationlogicalname = oLogicalFileName;
			if ( ! oSprayConfig.format ) {
				oPromises.push( this._spray_error( pParent, i ) );
			} else {
				switch ( oSprayConfig.format ) {
					case "delimited":
					case "csv":
						oPromises.push( this._spray_delimited( pParent, oSprayConfig, pExecutor ) );
						break;
					case "fixed":
						oPromises.push( this._spray_fixed( pParent, oSprayConfig, pExecutor ) );
						break;
					case "xml":
						oPromises.push( this._spray_xml( pParent, oSprayConfig, pExecutor ) );
						break;
					default:
						winston.log('error', '[%s] Spray format [%s] not supported.', pParent, oSprayConfig.format);
						break;
				}
			}
		}
		PromiseSeq( oPromises, {} ).then(function( pData ) {
			oPromise.resolve( pData );
		}, function( pError ) {
			winston.log('error', '[%s] Unexpected error spraying.', pParent, pError);
			oPromise.reject( pError );
			
		});
		
	} catch (e) {
		winston.log('error', '[%s] Unexpected error processing step.', pParent, e);
		oPromise.reject( e );
	} finally {
		winston.log('debug', '[%s] Done processing spray.', pParent);
	}
	
	//oPromise.reject('TEST ERROR');
	return oPromise;
}



exports = module.exports = ModClass;