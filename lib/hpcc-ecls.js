const path = require('path');
const fs = require('fs');
const Promises = require('./promises');
const SimpleLogger = require('./logger');
const TemplateEngine = require('./templating/engine');

var logger = new SimpleLogger({ level: 'info' });

const TEMP_ECL_FILE = "/tmp/etl-js.ecl";

var asPromised = function( pPreviousData, pKey, func, data) {
	if ( ! pPreviousData['hpcc-ecls'][pKey] ) pPreviousData['hpcc-ecls'][pKey] = {};
	pPreviousData['hpcc-ecls'][pKey] = data;
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
	if( pETL ) pETL.mod( 'hpcc-ecls', this, function( pSettings, pLogger ) {
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

var promise_executor = function( pExecutor, pFunc ) {
	var oArguments = arguments;
	return new Promise( function( resolve, reject) {
	
		var oArgs = Array.prototype.slice.call( oArguments );
		oArgs = oArgs.slice(2);
		
		var oArgs = oArgs.concat( [ function( error, stdout, stderr) {
			var data = { error: error, stdout: stdout, stderr: stderr };
			if ( error ) {
				reject( data );
			} else {
				resolve( data );
			}
		} ]);
		pFunc.apply( pExecutor, oArgs )
		
	});
}

ModClass.prototype._read_config = function( pParent, pKey, pConfig, pTemplateIndex ) {
	var oDefaults = {
		cluster: null,
		queue: null,
		graph: null,
		timeout: null,
		ecl: null,
		file: null,
		// default | csv | csvh | xml | runecl | bin(ary)
		format: null,
		output: null,
		jobname: null,
		pagesize: 500
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


ModClass.prototype._wrap_run = function( pParent, pKey, pConfig, pExecutor, pContext, pTemplateIndex ) {
	var that = this;
	return function( pPreviousData ) { 
		logger.debug('[%s] Executing ecl...', pParent );
		try {
			return that._run( pPreviousData, pParent, pKey, pConfig, pExecutor, pContext, pTemplateIndex );
		} catch (e) {
			logger.error('[%s] Error executing ecl.', pParent );
		} finally {
			logger.debug('[%s] Done executing ecl.', pParent );
		}
	};
}

ModClass.prototype._run = function( pPreviousData, pParent, pKey, pConfig, pExecutor, pContext, pTemplateIndex ) {
	var that = this;
	var oTemplateIndex = pTemplateIndex || 0;
	return new Promise( function( resolve, reject) {
		try {
			var oCmdArgs = [];
			oCmdArgs.push("action=query");
			for ( var i in pConfig ) {
				i = new String(i).toLowerCase();
				
				if ( pConfig[i] == null ) continue;
				switch (i) {
					case "server":
						oCmdArgs.push( "server=" + pConfig[i]);
						break;
					case "username":
						oCmdArgs.push( "username=" + pConfig[i]);
						break;
					case "password":
						oCmdArgs.push( "password=" + pConfig[i]);
						break;
					case "cluster":
						oCmdArgs.push("cluster=" + pConfig[i]);
						break;
					case "output": 
						if ( pConfig[i] ) {
							var oOutput = pConfig[i];
							var oOutputs = oOutput.indexOf("{{") < 0 ? [oOutput]: that._evaluate( oOutput, pContext );
							oCmdArgs.push("output=" + oOutputs[ oTemplateIndex ]);
						}
						break;
					case "format":
						oCmdArgs.push("format=" + pConfig[i]);
						break;
					default:
						//TODO
						break;
				}
			}
			
			oCmdArgs.push('@' + TEMP_ECL_FILE);
			var oCmd = "/usr/bin/eclplus " + oCmdArgs.join(' ');
			
			
			that._prepareFile( pPreviousData, pParent, pKey, pConfig, pExecutor, pContext, pTemplateIndex )
				.then( function( pData) {
					logger.debug('[%s] Done creating ecl file. Executing ecl...', pParent);
					try {
						pExecutor.exec( oCmd, {}, function( error, stdout, stderr ) {
							var data = { error: error, result: null, message: null, exit: false, pass: true, _stdout: stdout, _stderr: stderr  };
							var func = null;
							
							logger.debug('[%s] Done executing ECL.', pParent);
							if ( error ) {
								//reject( error );
								func = reject;
								data.result = data._stderr;
							} else {
								//resolve( stdout );
								func = resolve;
								data.result = data._stdout;
							}
							
							asPromised( pPreviousData, pKey, func, data );
						});
					} catch(e) {
						var data = { error: e, result: null, message: null, exit: false, pass: true, _stdout: null, _stderr: null  };
						logger.error('[%s] Error executing ECL.', pParent, e);
						asPromised( pPreviousData, pKey, reject, data );
					}
				}, function( pError ) {
					//console.dir( pError );
					var data = { error: pError.error, result: null, message: null, exit: false, pass: true, _stdout: pError.stdout, _stderr: pError.stderr  };
					logger.error('[%s] Error preparing ECL.', pParent, pError);
					asPromised( pPreviousData, pKey, reject, data );
				}
			);
			
		} catch (e) {
			logger.error('[%s] Unexpected error processing step.', pParent, e);
			reject( e );
		}
	});
};

ModClass.prototype._prepareFile = function( pPreviousData, pParent, pKey, pConfig, pExecutor, pContext, pTemplateIndex ) {
	var that = this;
	
	
	var getContent = function() {
		if ( pConfig['content'] ) {
			return Promise.resolve( pConfig['content'] );
		} 
		var oFileURI = pConfig['file'] || '';
		if ( oFileURI !== '' ) {
			var oFileURIs = oFileURI.indexOf("{{") < 0 ? [oFileURI]: that._evaluate( oFileURI, pContext );
			oFileURI = oFileURIs[ pTemplateIndex ];
		}
		if ( oFileURI.startsWith('file://') ) {
			var oPath = oFileURI.substring(7); // removing "file://"
			//console.log('file path=' + oPath);
			oPath = path.resolve( process.cwd(), oPath );
			//console.log('file RESOLVED path=' + oPath);
			var oContent = fs.readFileSync(oPath, 'utf8');
			return Promise.resolve( oContent );
		} else if ( oFileURI !== '' ) {
			return promise_executor( pExecutor, pExecutor.exec, 'wget -O ' + TEMP_ECL_FILE + ' "' + oFileURI + '"', {} ).then( function( pData ) {
				logger.debug('[%s] Done downloading ecl file [%s].', pParent, pConfig['file']);
				var oContent = fs.readFileSync(TEMP_ECL_FILE, 'utf8');
				return Promise.resolve( oContent );
			});
		} else {
			return Promise.reject('No ECL content or file to use.');
		}
	}
	
	return getContent().then( function( pContent ) {
		var oContents = pContent.indexOf("{{") < 0 ? [pContent]: that._evaluate( pContent, pContext );
		var oContent = oContents[ pTemplateIndex ];
		return promise_executor( pExecutor, pExecutor.writeFile, TEMP_ECL_FILE, oContent );
	}, function( pError ) {
		return Promise.reject( pError );
	});
	
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pContext ) { //pCurrentActivityResult, pGlobalResult, pContext ) {
	//var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
	var that = this;
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] Running ECL mod...', pParent);
		try {
			var oData = { 'hpcc-ecls' : {} };
			var oPromises = [];
			
			for (var i in pConfig) {
				var oConfig = pConfig[i];
				var oKeys = i.indexOf("{{") < 0 ? [i]: that._evaluate( i, pContext );
				oKeys.forEach( function( e, j ) {
					var oECLConfig = that._read_config( pParent, e, oConfig, j );
					oPromises.push( that._wrap_run( pParent, e, oECLConfig, pExecutor, pContext, j ) );
				});
			}
			Promises.seq( oPromises, oData ).then(function( pData ) {
				//resolve( pData );
				resolve( oData );
			}, function( pError ) {
				logger.error('[%s] Error in ECL mod.', pParent, pError);
				reject( pError );
				
			});
		} catch (e) {
			reject( e );
			logger.error('[%s] Unexpected error in ECL mod.', pParent, e);
		}
	});
}

exports = module.exports = ModClass;
