const SimpleLogger = require('../../lib/logger');

var logger = new SimpleLogger();


ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'moder', this, function( pSettings, pLogger ) {
		that.mSettings = pSettings;
		if ( pLogger ) logger = pLogger;
	});
	this.mCalls = 0;
}

ModClass.prototype.calls = function() {
	return this.mCalls;
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		that.mCalls++;
		logger.debug('[%s] In mod mod. Settings: hello=%s', pParent, that.mSettings['hello']);
		resolve();
	});
}

exports = module.exports = ModClass;
