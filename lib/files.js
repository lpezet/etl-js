const winston = require('winston');
const Fs = require('fs');
const Promises = require('./promises');

const TemplateEngine = require('./templating/engine');

var asPromised = function( pPreviousData, pKey, func, data) {
	if ( ! pPreviousData.files[pKey] ) pPreviousData.files[pKey] = {};
	pPreviousData.files[pKey] = data;
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
	if( pETL ) pETL.mod( 'files', this, function( pSettings ) {
		that.mSettings = pSettings;
	});
	
	this.mTemplateEngine = new TemplateEngine();
}

ModClass.prototype._single_download = function( pParent, pExecutor, pTarget, pSource ) {
	return function( pPreviousData ) {
		return new Promise( function( resolve, reject ) {
			//TODO: Handle templates here for pSource and pTarget.
			// Example:
			// pTarget: /tmp/{{ $.step1.commands.001_test.result }}
			// pSource: http://a.b.c/{{ $.step1.commands.001_test.result }}/download
			//
			pExecutor.exec('[ ! -d $(dirname "' + pTarget + '") ] && mkdir -p $(dirname "' + pTarget + '"); wget -O "' + pTarget + '" "' + pSource + '" 2>&1', {}, function( error, stdout, stderr ) {
				var data = { error: error, result: null, message: null, exit: false, pass: true, _stdout: stdout, _stderr: stderr,  };
				var func = null;
				
				if ( error ) {
					winston.log('error', '[%s] Error getting file [%s]. exit code = %s, error = %s"', pParent, pSource, error.code, error);
					//reject( error );
					func = reject;
					data.result = stderr;
				} else {
					//resolve();
					func = resolve;
					data.result = stdout;
				}
				asPromised( pPreviousData, pTarget, func, data );
			});
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
	return this.mTemplateEngine.evaluate( pTemplate, pContext.global );
}

ModClass.prototype._download = function( pParent, pExecutor, pTarget, pSource, pContext ) {
	var that = this;
	//console.log('pSource.indexOf("{{") = ' + pSource.indexOf("{{"));
	var oSources = pSource.indexOf("{{") < 0 ? [pSource] : this._evaluate( pSource, pContext );
	var oTargets = pTarget.indexOf("{{") < 0 ? [pTarget] : this._evaluate( pTarget, pContext );
	//console.log('oSources = ');
	//console.dir( oSources );
	if ( oSources.length != oTargets.length ) {
		return function() { 
			return Promise.reject( { error: 'Template used in source/target do not match (sources=[' + oSources + '], targets=[' + oTargets + '])', result: null, message: null, exit: false, pass: true, _stdout: null, _stderr: null }); 
		};
	}
	
	if ( oSources.length == 1) {
		return this._single_download( pParent, pExecutor, oTargets[0], oSources[0], pContext );
	} else {
		return function( pPreviousData ) {
			return new Promise( function( resolve, reject ) {
				try {
					var oData = { 'files' : {} };
					var oPromises = [];
					for (var i in oSources) {
						var oSource = oSources[i];
						var oTarget = oTargets[i];
						oPromises.push( that._single_download( pParent, pExecutor, oTarget, oSource ) );
					}
					Promises.seq( oPromises, oData).then(function( pData ) {
						winston.log('debug', '[%s] Done processing multiple files.', pParent);
						//console.log('files_download.then(): pData=');
						//console.dir( pData );
						//console.log('oData=');
						//console.dir( oData );
						//resolve( pData );
						resolve( oData );
					}, function( pError ) {
						winston.log('error', '[%s] Unexpected error getting multiple files.', pParent, pError);
						reject( pError );
					});
				} catch (e) {
					winston.log('error', '[%s] Unexpected error processing multiple files.', pParent, e);
					reject( e );
				}
			});
		};
	}
};

ModClass.prototype._create = function( pParent, pExecutor, pTarget, pContent, pContext ) {
	return function( pPreviousData ) {
		return new Promise( function( resolve, reject ) {
			pExecutor.writeFile(pTarget, pContent, function( error, stdout, stderr ) {
				var data = { error: error, result: null, message: null, exit: false, pass: true, _stdout: stdout, _stderr: stderr,  };
				var func = null;
				
				if ( error ) {
					winston.log('error', '[%s] Error creating file with content.', pParent, error);
					//reject( error );
					func = reject;
					data.result = stderr;
				} else {
					winston.log('debug', '[%s] Done creating file with content.', pParent);
					//resolve( stdout );
					func = resolve;
					data.result = stdout;
				}
				asPromised( pPreviousData, pTarget, func, data );
			});
		});
	}
};

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pActivityContext, pGlobalContext ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		winston.log('debug', '[%s] Processing files...', pParent);
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
					winston.log('debug', '[%s] File(s): source=[%s], target=[%s]...', pParent, oSource, oTarget);
					oPromises.push( that._download( pParent, pExecutor, oTarget, oSource, { local: pActivityContext, global: pGlobalContext } ) );
				} else if ( pConfig[i].content ) {
					var oContent = pConfig[i].content;
					winston.log('debug', '[%s] Creating file [%s] with content...', pParent, oTarget);
					oPromises.push( that._create( pParent, pExecutor, oTarget, oContent, { local: pActivityContext, global: pGlobalContext } ) );
				}
				//oPromise.resolve();
				//winston.log('info', 'Gotta do something like:\nwget -o %s "%s"', oTarget, oSource);
			}
			Promises.seq( oPromises, oData).then(function( pData ) {
				winston.log('debug', '[%s] Done processing files.', pParent);
				//resolve( pData );
				resolve( oData );
			}, function( pError ) {
				winston.log('error', '[%s] Unexpected error getting file.', pParent, pError);
				reject( pError );
			});
		} catch (e) {
			winston.log('error', '[%s] Unexpected error processing step.', pParent, e);
			reject( e );
		}
	});
}



exports = module.exports = ModClass;