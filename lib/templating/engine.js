var ParserClass = require('./parser');
var WriterClass = require('./writer');



var Engine = function() {
	this.mParser = new ParserClass();
	this.mWriter = new WriterClass();
}

Engine.prototype.evaluate = function( pTemplate, pContext, pCallback ) {
	var oTokens = this.mParser.parseToTokens( pTemplate );
	var oResults = this.mWriter.renderTokens( oTokens, pContext );
	if ( pCallback ) {
		pCallback( null, oResults );
	} else {
		return oResults;
	}
}

Engine.prototype.create_context = function() {
	var res = {};
	for (var i in arguments) {
		if ( ! arguments[i] ) continue;
		var src = arguments[i];
		for (var j in src) {
			// Throw error is res[j] already exists
			if ( res[j] ) {
				throw new Error('Could not create template context. Key [' + j + '] already exists.');
			}
			res[j] = src[j];
		}
	}
	return res;
}


exports = module.exports = Engine;
