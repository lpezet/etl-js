const util = require('util');
const Promises = require('./promises');
const SimpleLogger = require('./logger');

var logger = new SimpleLogger({ level: 'info' });

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'image_charts', this, function( pSettings, pLogger ) {
		that.mSettings = pSettings;
		if ( pLogger ) logger = pLogger;
	});
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

ModClass.prototype._exec = function( pParent, pKey, pSpecs, pExecutor ) {
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

ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pPreviousStepData ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		logger.debug('[%s] Processing image-charts...', pParent);
		try {
			var oData = { 'image_charts' : {} };
			var oPromises = [];
			for (var i in pConfig) {
				oPromises.push( that._exec( pParent, i, pConfig[i], pExecutor ));
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
