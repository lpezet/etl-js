/*
The MIT License

Copyright (c) 2009 Chris Wanstrath (Ruby)
Copyright (c) 2010-2014 Jan Lehnardt (JavaScript)
Copyright (c) 2010-2015 The mustache.js community

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const Scanner = require('./scanner');

var isArray = Array.isArray || function isArrayPolyfill (object) {
	return objectToString.call(object) === '[object Array]';
};
function escapeRegExp (string) {
	return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
};
var regExpTest = RegExp.prototype.test;
function testRegExp (re, string) {
	return regExpTest.call(re, string);
};

var nonSpaceRe = /\S/;
function isWhitespace (string) {
	return !testRegExp(nonSpaceRe, string);
};

var whiteRe = /\s*/;
var spaceRe = /\s+/;
//var equalsRe = /\s*=/;
//var curlyRe = /\s*\}/;
var tagRe = /#|\^|\/|>|\{|&|=|!/;

/**
* Forms the given array of `tokens` into a nested tree structure where
* tokens that represent a section have two additional items: 1) an array of
* all tokens that appear in that section and 2) the index in the original
* template that represents the end of that section.
*/
function nestTokens (tokens) {
	var nestedTokens = [];
	var collector = nestedTokens;
	//var sections = [];

	var token;//, section;
	for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
	  token = tokens[i];

	  switch (token[0]) {
	  	/*
		case '#':
		case '^':
		  collector.push(token);
		  sections.push(token);
		  collector = token[4] = [];
		  break;
		case '/':
		  section = sections.pop();
		  section[5] = token[2];
		  collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
		  break;
		*/
		default:
		  collector.push(token);
	  }
	}
	return nestedTokens;
};

/**
* Combines the values of consecutive text tokens in the given `tokens` array
* to a single token.
*/
function squashTokens (tokens) {
	var squashedTokens = [];

	var token, lastToken;
	for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
	  token = tokens[i];

	  if (token) {
		if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
		  lastToken[1] += token[1];
		  lastToken[3] = token[3];
		} else {
		  squashedTokens.push(token);
		  lastToken = token;
		}
	  }
	}

	return squashedTokens;
}



var Parser = function() {
	this._compileTags( ["{{", "}}"]);
}

Parser.prototype._compileTags = function(tagsToCompile) {
	  if (typeof tagsToCompile === 'string')
		tagsToCompile = tagsToCompile.split(spaceRe, 2);

	  if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
		throw new Error('Invalid tags: ' + tagsToCompile);

	  this.mOpeningTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + '\\s*');
	  this.mClosingTagRe = new RegExp('\\s*' + escapeRegExp(tagsToCompile[1]));
	  this.mClosingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tagsToCompile[1]));
	}

Parser.prototype.parseToTokens = function( pTemplate ) {
	//var sections = [];     // Stack to hold section tokens
	var tokens = [];       // Buffer to hold the tokens
	var spaces = [];       // Indices of whitespace tokens on the current line
	var hasTag = false;    // Is there a {{tag}} on the current line?
	var nonSpace = false;  // Is there a non-space char on the current line?
	
	function stripSpace () {
		if (hasTag && !nonSpace) {
			while (spaces.length)
		  		delete tokens[spaces.pop()];
	  	} else {
			spaces = [];
	  	}
		hasTag = false;
	  	nonSpace = false;
	};

	var scanner = new Scanner( pTemplate );

    var start, type, value, chr, token;//, openSection;
    
    while (!scanner.eos()) {
		start = scanner.pos;

      	// Match any text between tags.
      	value = scanner.scanUntil(this.mOpeningTagRe);
      	
      	if (value) {
      		for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
				chr = value.charAt(i);

			  	if (isWhitespace(chr)) {
			  		spaces.push(tokens.length);
			  	} else {
					nonSpace = true;
			  	}

				tokens.push([ 'text', chr, start, start + 1 ]);
			  	start += 1;

			  	// Check for whitespace on the current line.
			  	if (chr === '\n') {
					stripSpace();
				}
			}
		}
		
		// Match the opening tag.
      	if (!scanner.scan(this.mOpeningTagRe)) {
      		//console.log('!scanner.scan(openingTagRe)');
        	break;
        }

      	hasTag = true;
      	
      	// Get the tag type.
      	type = scanner.scan(tagRe) || 'name';
     	scanner.scan(whiteRe);
     	
     	//console.log('type = ' + type);
     	
     	// Get the tag value.
     	/*
      	if (type === '=') {
			value = scanner.scanUntil(equalsRe);
			scanner.scan(equalsRe);
			scanner.scanUntil(this.mClosingTagRe);
      	} else if (type === '{') {
			value = scanner.scanUntil(this.mClosingCurlyRe);
			scanner.scan(curlyRe);
			scanner.scanUntil(this.mClosingTagRe);
			type = '&';
		} else {
		*/
			value = scanner.scanUntil(this.mClosingTagRe);
		//}
		
		//console.log('value = ' + value);
		
		// Match the closing tag.
      	if (!scanner.scan(this.mClosingTagRe))
        	throw new Error('Unclosed tag at ' + scanner.pos);
	
		token = [ type, value, start, scanner.pos ];
		
		//console.log('tokens.push():');
		//console.dir(token);
      	tokens.push(token);

      	/*
      	if (type === '#' || type === '^') {
        	sections.push(token);
      	} else if (type === '/') {
        	// Check section nesting.
        	openSection = sections.pop();

        	if (!openSection)
          		throw new Error('Unopened section "' + value + '" at ' + start);

        	if (openSection[1] !== value)
          		throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
      	} else 
      	*/
      	if (type === 'name' || type === '{' || type === '&') {
        	nonSpace = true;
      	}
      	/*else if (type === '=') {
        	// Set the tags for the next time around.
        	compileTags(value);
      	}
      	*/
    }

    // Make sure there are no open sections when we're done.
    //openSection = sections.pop();
    //if (openSection)
    //  throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

    return nestTokens(squashTokens(tokens));

}


exports = module.exports = Parser;
