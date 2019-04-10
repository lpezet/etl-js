const Promises = require('./promises');
const SimpleLogger = require('./logger');
const TemplateEngine = require('./templating/engine');

var logger = new SimpleLogger({ level: 'info' });

const TEMP_ECL_FILE = "/tmp/etl-js.ecl";

var asPromised = function( pPreviousData, pKey, func, data) {
	if ( ! pPreviousData.ecls[pKey] ) pPreviousData.ecls[pKey] = {};
	pPreviousData.ecls[pKey] = data;
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
	if( pETL ) pETL.mod( 'ecls', this, function( pSettings, pLogger ) {
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

ModClass.prototype._read_config = function( pParent, pKey, pConfig ) {
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


ModClass.prototype._wrap_run = function( pParent, pKey, pConfig, pExecutor, pContext ) {
	var that = this;
	return function( pPreviousData ) { 
		logger.debug('[%s] Executing ecl...', pParent );
		try {
			return that._run( pPreviousData, pParent, pKey, pConfig, pExecutor, pContext );
		} catch (e) {
			logger.error('[%s] Error executing ecl.', pParent );
		} finally {
			logger.debug('[%s] Done executing ecl.', pParent );
		}
	};
}

ModClass.prototype._run = function( pPreviousData, pParent, pKey, pConfig, pExecutor, pContext ) {
	var that = this;
	return new Promise( function( resolve, reject) {
		try {
			var oCmdArgs = [];
			oCmdArgs.push("action=query");
			for ( var i in pConfig ) {
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
							oOutput = oOutput.indexOf("{{") < 0 ? oOutput: that._evaluate( oOutput, pContext );
							oCmdArgs.push("output=" + oOutput);
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
			
			if ( pConfig['content'] ) {
				var oContent = pConfig['content'];
				oContent = oContent.indexOf("{{") < 0 ? oContent: that._evaluate( oContent, pContext );
				
				promise_executor( pExecutor, pExecutor.writeFile, TEMP_ECL_FILE, oContent )
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
						logger.error('[%s] Error executing ECL (1).', pParent, e);
						asPromised( pPreviousData, pKey, reject, data );
					}
				}, function( pError ) {
					var data = { error: pError.error, result: null, message: null, exit: false, pass: true, _stdout: pError.stdout, _stderr: pError.stderr  };
					logger.error('[%s] Error executing ECL (2).', pParent, pError);
					asPromised( pPreviousData, pKey, reject, data );
				});
				
			} else if ( pConfig['file'] ) {
				promise_executor( pExecutor, pExecutor.exec, 'wget -O ' + TEMP_ECL_FILE + ' "' + pConfig['file'] + '"', {} )
				.then( function( pData) {
					logger.debug('[%s] Done downloading ecl file [%s].', pParent, pConfig['file']);
					pExecutor.exec( oCmd, {}, function( error, stdout, stderr ) {
						var data = { error: error, result: null, message: null, exit: false, pass: true, _stdout: stdout, _stderr: stderr  };
						var func = null;
						
						if ( error ) {
							logger.error('[%s] Error when executing ECL from file [%s]. Error: %s', pParent, TEMP_ECL_FILE, error);
							//reject( error );
							func = reject;
							data.result = data._stderr;
						} else {
							logger.debug('[%s] Done executing ECL from file [%s].', pParent, TEMP_ECL_FILE);
							//resolve( stdout );
							func = resolve;
							data.result = data._stdout;
						}
						
						asPromised( pPreviousData, pKey, func, data );
					});
				}, function( pError ) {
					var data = { error: pError.error, result: null, message: null, exit: false, pass: true, _stdout: pError.stdout, _stderr: pError.stderr  };
					logger.error('[%s] Error downloading ECL file [%s].', pParent, pConfig['file'], pError);
					//reject( pError );
					asPromised( pPreviousData, pKey, reject, data );
				});
			} else {
				reject('Must specify at least file: or content: to run ECL code.');
			}
			
		} catch (e) {
			logger.error('[%s] Unexpected error processing step.', pParent, e);
			reject( e );
		}
	});
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pCurrentActivityResult, pGlobalResult, pContext ) {
	var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
	var that = this;
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] Running ECL...', pParent);
		try {
			var oData = { 'ecls' : {} };
			var oPromises = [];
			
			for (var i in pConfig) {
				var oKey = i;
				oKey = oKey.indexOf("{{") < 0 ? oKey: that._evaluate( oKey, oTemplateContext );
				
				var oECLConfig = that._read_config( pParent, oKey, pConfig[i] );
				oPromises.push( that._wrap_run( pParent, oKey, oECLConfig, pExecutor, oTemplateContext ) );
			}
			Promises.seq( oPromises, oData ).then(function( pData ) {
				//resolve( pData );
				resolve( oData );
			}, function( pError ) {
				logger.error('[%s] Error running ECL.', pParent, pError);
				reject( pError );
				
			});
		} catch (e) {
			reject( e );
			logger.error('[%s] Unexpected error running ECL.', pParent, e);
		}
	});
}

exports = module.exports = ModClass;
