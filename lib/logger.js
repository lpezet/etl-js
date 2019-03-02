const util = require('util');

// see
// https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/logging.html
function SimpleLogger( pConfig ) {
	var format = function( pString, ...pValues) {
		if ( pValues.length >= 1 ) {
			var params = [];
			params.push( pString );
			for (var i = 0; i < pValues.length; i++ ) {
				var val = pValues[i];
				if ( val === undefined ) continue;
			
				if (Array.isArray( val ) ) {
					params = params.concat( val );
				} else {
					params.push( val );
				}
			}
			return util.format.apply( util, params );
		} else {
			return arguments[0];
		}
	}
	var levelCode = function( pLevel ) {
		switch ( pLevel ) {
			case "error":
				return 0;
			case "warn":
			case "warning":
				return 1;
			case "info":
				return 2;
			case "verbose":
				return 3;
			case "debug":
				return 4;
			default:
				return 5;
		}
	}
	var level = (pConfig && pConfig['level'] ) ? pConfig['level'] : 'info';
	var levelCode = levelCode( level );
	return {
		error: function( pMessage, ...pValues) {
			console.log( 'ERROR: ' + format( pMessage, Array.prototype.slice.call( arguments , 1 ) ) );
		},
		warn: function( pMessage, ...pValues) {
			if ( levelCode >= 1 ) console.log( 'WARN : ' + format( pMessage, pValues ) );
		},
		info: function( pMessage, ...pValues) {
			if ( levelCode >= 2 ) console.log( 'INFO :' + format( pMessage, pValues ) );
		},
		debug: function( pMessage, ...pValues) {
			if ( levelCode >= 3 ) console.log( 'DEBUG: ' + format( pMessage, pValues ) );
		},
		trace: function( pMethod, pRequestUrl, pBody, pResponseBody, pResponseStatus ) {
		},
		close: function() {
		}
	};
}

exports = module.exports = SimpleLogger;
