const winston = require('winston');

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'moder', this, function( pSettings ) {
		that.mSettings = pSettings;
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
		winston.log('debug', '[%s] In mod mod. Settings: hello=%s', pParent, that.mSettings['hello']);
		resolve();
	});
}

exports = module.exports = ModClass;