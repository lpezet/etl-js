const Promises = require('./promises');
const TemplateEngine = require('./templating/engine');
const SimpleLogger = require('./logger');

var logger = new SimpleLogger({ level: 'info' });

var asPromised = function( pPreviousData, pKey, func, data) {
	try {
		if ( ! pPreviousData.files[pKey] ) pPreviousData.files[pKey] = {};
		pPreviousData.files[pKey] = data;
		//if ( data['exit'] ) {
		//	pPreviousData['_exit'] = data['exit'];
		//	pPreviousData['_exit_from'] = pKey;
		//}
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
	} catch(e) {
		logger.error('Unexpected error asPromised.', e);
	}
}

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'files', this, function( pSettings, pLogger ) {
		that.mSettings = pSettings;
		if ( pLogger ) logger = pLogger;
	});
	
	this.mTemplateEngine = new TemplateEngine();
}

ModClass.prototype._handle_perms = function( pParent, pExecutor, pTarget, pPerms ) {
	if ( ! pPerms['mode'] || ! pPerms['group'] || ! pPerms['owner'] ) return Promise.resolve();
	
	var oCmd = '[ -f "' + pTarget + '" ]';
	if ( pPerms['mode'] ) oCmd += ' && chmod ' + pPerms.mode + ' "' + pTarget + '"';
	if ( pPerms['group'] ) oCmd += ' && chgrp ' + pPerms.group + ' "' + pTarget + '"';
	if ( pPerms['owner'] ) oCmd += ' && chown ' + pPerms.owner + ' "' + pTarget + '"';
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] File: setting permissions: cmd=[%s]...', pParent, oCmd);
		pExecutor.exec( oCmd , {}, function( error, stdout, stderr ) {
			if ( error ) {
				reject( error );
			} else {
				resolve();
			}
		});
	});
}

ModClass.prototype._single_download = function( pParent, pExecutor, pTarget, pSource, pPerms ) {
	var that = this;
	return function( pPreviousData ) {
		return new Promise( function( resolve, reject ) {
			//TODO: Handle templates here for pSource and pTarget.
			// Example:
			// pTarget: /tmp/{{ $.step1.commands.001_test.result }}
			// pSource: http://a.b.c/{{ $.step1.commands.001_test.result }}/download
			//
			logger.debug('[%s] File: source=[%s], target=[%s]...', pParent, pSource, pTarget);
			var data = { error: null, result: null, message: null, exit: false, pass: false };
			try {
				pExecutor.exec('[ ! -d $(dirname "' + pTarget + '") ] && mkdir -p $(dirname "' + pTarget + '"); wget -O "' + pTarget + '" "' + pSource + '" 2>&1', {}, function( error, stdout, stderr ) {
					data.error = error;
					data.pass = true; //???
					data['_stdout'] = stdout;
					data['_stderr'] = stderr;
					//var func = null;
					
					if ( error ) {
						logger.error('[%s] Error getting file [%s]. exit code = %s, error = %s"', pParent, pSource, error.code, error);
						//reject( error );
						//func = reject;
						data.result = stderr;
						
						asPromised( pPreviousData, pTarget, reject, data );
					} else {
						data.result = stdout;
						
						that._handle_perms( pParent, pExecutor, pTarget, pPerms)
						.then(function() {
							asPromised( pPreviousData, pTarget, resolve, data );
						}, function( error ) {
							data.result = error;
							asPromised( pPreviousData, pTarget, reject, data );
						});
						//resolve();
						//func = resolve;
						//data.result = stdout;
					}
					//asPromised( pPreviousData, pTarget, func, data );
				});
			} catch (e) {
				data.error = e;
				asPromised( pPreviousData, pTarget, reject, data );
			}
		});
	}
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
}

ModClass.prototype._download = function( pParent, pExecutor, pTarget, pSource, pPerms, pContext ) {
	var that = this;
	var oSources = pSource.indexOf("{{") < 0 ? [pSource] : this._evaluate( pSource, pContext );
	var oTargets = pTarget.indexOf("{{") < 0 ? [pTarget] : this._evaluate( pTarget, pContext );
	if ( oSources.length !== oTargets.length ) {
		return function() { 
			return Promise.reject( { error: 'Template used in source/target do not match (sources=[' + oSources + '], targets=[' + oTargets + '])', result: null, message: null, exit: false, pass: true, _stdout: null, _stderr: null }); 
		};
	}
	logger.debug('[%s] Downloading %s file(s)...', pParent, oSources.length);
	if ( oSources.length === 1) {
		return this._single_download( pParent, pExecutor, oTargets[0], oSources[0], pPerms, pContext );
	} else {
		return function( pPreviousData ) {
			return new Promise( function( resolve, reject ) {
				try {
					var oData = { 'files' : {} };
					var oPromises = [];
					for (var i in oSources) {
						var oSource = oSources[i];
						var oTarget = oTargets[i];
						oPromises.push( that._single_download( pParent, pExecutor, oTarget, oSource, pPerms, pContext ) );
					}
					Promises.seq( oPromises, oData).then(function( pData ) {
						logger.debug('[%s] Done processing multiple files.', pParent);
						//console.log('files_download.then(): pData=');
						//console.dir( pData );
						//console.log('oData=');
						//console.dir( oData );
						//resolve( pData );
						resolve( oData );
					}, function( pError ) {
						logger.error('[%s] Unexpected error getting multiple files.', pParent, pError);
						reject( pError );
					});
				} catch (e) {
					logger.error('[%s] Unexpected error processing multiple files.', pParent, e);
					reject( e );
				}
			});
		};
	}
};

ModClass.prototype._create = function( pParent, pExecutor, pTarget, pContent, pPerms, pContext ) {
	var that = this;
	return function( pPreviousData ) {
		return new Promise( function( resolve, reject ) {
			pExecutor.writeFile(pTarget, pContent, function( error, stdout, stderr ) {
				var data = { error: error, result: null, message: null, exit: false, pass: true, _stdout: stdout, _stderr: stderr,  };
				//var func = null;
				
				if ( error ) {
					logger.error('[%s] Error creating file with content.', pParent, error);
					//reject( error );
					//func = reject;
					data.result = stderr;
					asPromised( pPreviousData, pTarget, reject, data );
				} else {
					logger.debug('[%s] Done creating file with content.', pParent);
					data.result = stdout;
					that._handle_perms( pParent, pExecutor, pTarget, pPerms)
					.then(function() {
						asPromised( pPreviousData, pTarget, resolve, data );
					}, function( error ) {
						data.result = error;
						asPromised( pPreviousData, pTarget, reject, data );
					});
					//resolve( stdout );
					//func = resolve;	
				}
			});
		});
	}
};

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pContext ) { //pCurrentActivityResult, pGlobalResult, pContext ) {
	//var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
	var that = this;
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] Processing files...', pParent);
		//console.log('files: Activity Context=');
		//console.dir( pActivityContext );
		//console.log('files: Global Context=');
		//console.dir( pGlobalContext );
		try {
			//TODO:
			//pActivityContext[ pParent ]['files'] = {};
			//oData = pActivityContext[ pParent ] or ['files']....TBC
			var oData = { 'files' : {} };
			var oPromises = [];
			for (var i in pConfig) {
				var oTarget = i;
				
				if ( pConfig[i].source ) {
					var oSource = pConfig[i].source;
					//logger.debug('[%s] File(s): source=[%s], target=[%s]...', pParent, oSource, oTarget);
					oPromises.push( that._download( pParent, pExecutor, oTarget, oSource, pConfig[i], pContext ) );
				} else if ( pConfig[i].content ) {
					var oContent = pConfig[i].content;
					logger.debug('[%s] Creating file [%s] with content...', pParent, oTarget);
					oPromises.push( that._create( pParent, pExecutor, oTarget, oContent, pConfig[i], pContext ) );
				}
			}
			Promises.seq( oPromises, oData).then(function( pData ) {
				logger.debug('[%s] Done processing files.', pParent);
				//resolve( pData );
				//console.log('files.handle(): pData=');
				//console.dir( pData );
				//console.log('oData=');
				//console.dir(oData);
				
				resolve( pData );
			}, function( pError ) {
				logger.error('[%s] Error creating/getting file(s).', pParent, pError);
				reject( pError );
			});
		} catch (e) {
			logger.error('[%s] Unexpected error processing step.', pParent, e);
			reject( e );
		}
	});
}

exports = module.exports = ModClass;
