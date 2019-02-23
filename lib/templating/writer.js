var JSONPath = require('JSONPath');

var Writer = function() {
}

Writer.prototype._rawValue = function(token) {
	return token[1];
};

Writer.prototype._evaluateValue = function(path, json) {
	//console.log('path=' + path + ', json=');
	//console.dir(json);
	return JSONPath({json: json, path: path });
}

Writer.prototype._renderAndDuplicate = function( results, values, index ) {
	//console.log('render: index=' + index + ', results=');
	//console.dir( results );
	if ( index >= values.length ) return results;
	
	var vals = values[index];
	//console.log('vals=');
	//console.dir( vals );
	if ( ! Array.isArray( vals )) {
		//results.push( vals ); // ????
		for (var i = 0; i < results.length; i++) {
			var val = results[i];
			val.push( vals );
		}
		//console.log('pushed single value:' + results);
		return this._renderAndDuplicate( results, values, index+1);
	} else {
		if ( vals.length == 1 && Array.isArray( vals[0] ) ) vals = vals[0]; // Case when element value is an array itself.
		//console.log('It is an array!!!!');
		var newResults = [];
		if ( vals.length == 0 ) {
			vals.push(""); // dummy value
		}
		for (var i = 0; i < vals.length; i++) {
			for (var j = 0; j < results.length; j++) {
				var copy = results[j].slice();
				copy.push( vals[i] );
				//console.log('copy:');
				//console.dir(copy);
				newResults.push( copy );
			}
			
		}
	
		results = newResults;
	}
	return this._renderAndDuplicate( results, values, index+1);	
};

Writer.prototype._reduce = function( pArrays ) {
	var oResults = [];
	for (var i = 0; i < pArrays.length; i++) {
		oResults.push( pArrays[i].join('') );
	}
	return oResults;
}

Writer.prototype.renderTokens = function( pTokens, pContext) {
	var values = [];

    var token, symbol, value;
    for (var i = 0, numTokens = pTokens.length; i < numTokens; ++i) {
    	value = undefined;
      	token = pTokens[i];
      	symbol = token[0];
		
		//console.log('i=' + i + ', symbol=' + symbol);
		if (symbol === 'text') value = this._rawValue(token);
		else if (symbol === 'name') value = this._evaluateValue(token[1], pContext);
		
		//console.log('i=' + i + ', value=');
		//console.dir(value);
		if (value !== undefined)
        	values.push( value );
        else
        	values.push( "" );
    }
	
    var oArrays = this._renderAndDuplicate( [[]], values, 0 );
	
    return this._reduce( oArrays );
};


exports = module.exports = Writer;