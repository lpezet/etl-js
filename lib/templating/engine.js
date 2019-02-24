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


exports = module.exports = Engine;
