const util = require('util');
const Promises = require('./promises');
const SimpleLogger = require('./logger');
const TemplateEngine = require('./templating/engine');

var logger = new SimpleLogger({ level: 'info' });

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'image_charts', this, function( pSettings, pLogger ) {
		that.mSettings = pSettings;
		if ( pLogger ) logger = pLogger;
	});
	this.mTemplateEngine = new TemplateEngine();
}

var asPromised = function( pPreviousData, pKey, func, data) {
	if ( ! pPreviousData.image_charts[pKey] ) pPreviousData.image_charts[pKey] = {};
	pPreviousData.image_charts[pKey] = data;
	func( pPreviousData );
}

var get_data_file_content = function( pParent, pKey, pDataFile, pCmdOptions, pExecutor ) {
	return new Promise(function( resolve, reject ) {
		logger.debug('[%s] Getting data file content...', pParent);
		pExecutor.exec( 'cat ' + pDataFile, pCmdOptions, function( error, stdout, stderr ) {
			var data = { error: error, stdout: stdout, stderr: stderr };
			if ( error ) {
				data.error = util.format.apply(null, [ 'Could not get data file content. Exit code %s: %s.', pKey, error.code, error] );
				reject( data ); 
			} else {
				logger.debug('[%s] Done getting data file content for [%s].', pParent, pKey);
				resolve( data );
			}
		});
	});
}

var create_image_charts_url = function( pArgs ) {
	var oArgs = pArgs.join("&");
	return "https://image-charts.com/chart?" + oArgs;
}

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

ModClass.prototype._exec = function( pParent, pKey, pSpecs, pExecutor, pContext ) {
	var that = this;
	return function( pPreviousData ) {
		return new Promise( function( resolve, reject ) {
			
			try {
				logger.debug('[%s] Creating image-charts [%s]...', pParent, pKey);
				var oChartArgs = [];
				for (var i in pSpecs) {
					switch (i) {
						case "chs":
							oChartArgs.push('chs=' + pSpecs[i]);
							break;
						case "cht":
							oChartArgs.push('cht=' + pSpecs[i]);
							break;
						case "chtt":
							var oTitle = pSpecs[i];
							if ( oTitle ) {
								oTitle = oTitle.indexOf("{{") < 0 ? oTitle: that._evaluate( oTitle, pContext )[0];
								oChartArgs.push('chtt=' + oTitle);
							}
							break;
						case "chxt":
							oChartArgs.push('chxt=' + pSpecs[i]);
							break;
						case "chxs":
							oChartArgs.push('chxs=' + pSpecs[i]);
							break;
						default:
							//TODO
							break;
					}
				}
				var oChartDataFile = pSpecs['data'];
				oChartDataFile = oChartDataFile.indexOf("{{") < 0 ? oChartDataFile: that._evaluate( oChartDataFile, pContext );
				
				var oCmdOptions = {};
				oCmdOptions['context'] = pKey;

				
				get_data_file_content( pParent, pKey, oChartDataFile, oCmdOptions, pExecutor ).then( function( pData ) {
					var data = { error: pData.error, result: null, message: null, exit: false, pass: true, _stdout: pData.stdout, _stderr: pData.stderr  };
					var func = resolve;
					if ( data.error ) {
						func = reject;
					} else {
						var oArgs = pData.stdout.split(/\r?\n/);
						if ( oArgs.length >= 3) {
							oChartArgs.push('chxl=0:|' + oArgs[0]);
							oChartArgs.push('chdl=' + oArgs[1]);
							oChartArgs.push('chd=a:' + oArgs[2]);
							var url = create_image_charts_url(oChartArgs);
							logger.info('[%s] Url for [%s]:\n%s', pParent, pKey, url);
							
							data.result = url;
							//oResult.push( url );
						} else {
							func = reject;
							data.error = 'Invalid data for image-charts.';
							logger.error('[%s] Could not parse output: [%s]. Could not create chart url from it.', pParent, data);
						}
					}
					asPromised( pPreviousData, pKey, func, data );
					//resolve( oResult );
				}, function( error ) {
					//console.log( error );
					//reject( error );
					asPromised( pPreviousData, pKey, reject, { error: error, result: null } );
				});
				
			} catch ( e ) {
				logger.error('[%s] Unexpected error creating image-chart [%s].', pParent, pKey);
				reject( e );
			}
		});
	}
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pCurrentActivityResult, pGlobalResult, pContext ) {
	var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
	var that = this;
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] Processing image-charts...', pParent);
		try {
			var oData = { 'image_charts' : {} };
			var oPromises = [];
			for (var i in pConfig) {
				var oKey = i;
				oKey = oKey.indexOf("{{") < 0 ? oKey: that._evaluate( oKey, oTemplateContext );
				
				oPromises.push( that._exec( pParent, oKey, pConfig[i], pExecutor, oTemplateContext ));
			}
			Promises.seq( oPromises, oData ).then(function( pData ) {
				logger.debug('[%s] Done processing image-charts.', pParent);
				resolve( oData );
			}, function( pError ) {
				logger.error('[%s] Unexpected error running image-charts.', pParent, pError);
				reject( pError );
			});
		} catch (e) {
			logger.error('[%s] Unexpected error processing image-charts.', pParent, e);
			reject( e );
		}
	});
}

exports = module.exports = ModClass;
