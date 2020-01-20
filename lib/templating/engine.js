var ParserClass = require('./parser');
var WriterClass = require('./writer');


const DEBUG = false;


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

Engine.prototype.evaluateObject = function( pTemplate, pContext, pCallbackOrResult ) {
	return this.evaluateObjectExperimental( pTemplate, pContext, pCallbackOrResult );
}

Engine.prototype.evaluateObjectExperimental = function( pTemplate, pContext, pCallbackOrResult ) {
	var that = this;
	var oResult = typeof(pCallbackOrResult) === 'object' ? pCallbackOrResult : {};
	
	var traverse = function( pVal, pResult, pKey, pIndex ) {
		if (DEBUG) console.log("# Traversing [" + pKey + "]: val=" + pVal);
		if ( pVal == null ) return;
		if ( typeof( pVal ) === 'object') {
			pResult[ pKey ] = {};
			traverseObject( pVal, pResult[ pKey ], pIndex );
		} else {
			if (DEBUG) console.log("# pVal not an object: " + typeof( pVal ));
			if ( typeof( pVal ) === 'string' && pVal.indexOf("{{") >= 0 ) {
				if (DEBUG) console.log("## Found tag for : " + pVal + " (index=" + pIndex + ")");
				var oTagValues = that.evaluate( pVal, pContext );
				if ( oTagValues.length === 1 ) {
					pResult[ pKey ] = oTagValues[ 0 ];
				} else if ( pIndex >= oTagValues.length ) {
					throw new Error("Incompatible tag in sub-tree. Index=" + pIndex + ", tag values=" + oTagValues.length);
				} else {
					pResult[ pKey ] = oTagValues[ pIndex ];
				}
			} else {
				if (DEBUG) console.log("## pVal not a string or not a tag.");
				pResult[ pKey ] = pVal;
			}
			
		}
	}
	
	var traverseObject = function( pObj, pResult, pLastIndex ) {
		Object.keys( pObj ).forEach( function(e, i ) {
			if ( e.indexOf("{{") < 0 ) {
				if (DEBUG) console.log("# 1");
				traverse( pObj[ e ], pResult, e, pLastIndex );
			} else {
				if (DEBUG) console.log("# 2");
				var oTagValues = that.evaluate( e, pContext );
				oTagValues.forEach( function(f,j) {
					traverse( pObj[ e ], pResult, f, j );
				});
			}
		});
	}
	
	traverseObject( pTemplate, oResult );
	if ( typeof(pCallbackOrResult) === 'function' ) {
		pCallbackOrResult( oResult );
	} else {
		return oResult;
	}
}

exports = module.exports = Engine;
