const assert = require('chai').assert
const TestedClass = require('../../lib/templating/parser');

describe('parser',function(){
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});
	
	var expectations = {
			  ''                                        : [],
			  '{{hi}}'                                  : [ [ 'name', 'hi', 0, 6 ] ],
			  '{{hi.world}}'                            : [ [ 'name', 'hi.world', 0, 12 ] ],
			  '{{hi . world}}'                          : [ [ 'name', 'hi . world', 0, 14 ] ],
			  '{{ hi}}'                                 : [ [ 'name', 'hi', 0, 7 ] ],
			  '{{hi }}'                                 : [ [ 'name', 'hi', 0, 7 ] ],
			  '{{ hi }}'                                : [ [ 'name', 'hi', 0, 8 ] ],
			  'a\n b'                                   : [ [ 'text', 'a\n b', 0, 4 ] ],
			  'a{{hi}}'                                 : [ [ 'text', 'a', 0, 1 ], [ 'name', 'hi', 1, 7 ] ],
			  'a {{hi}}'                                : [ [ 'text', 'a ', 0, 2 ], [ 'name', 'hi', 2, 8 ] ],
			  ' a{{hi}}'                                : [ [ 'text', ' a', 0, 2 ], [ 'name', 'hi', 2, 8 ] ],
			  ' a {{hi}}'                               : [ [ 'text', ' a ', 0, 3 ], [ 'name', 'hi', 3, 9 ] ],
			  'a{{hi}}b'                                : [ [ 'text', 'a', 0, 1 ], [ 'name', 'hi', 1, 7 ], [ 'text', 'b', 7, 8 ] ],
			  'a{{hi}} b'                               : [ [ 'text', 'a', 0, 1 ], [ 'name', 'hi', 1, 7 ], [ 'text', ' b', 7, 9 ] ],
			  'a{{hi}}b '                               : [ [ 'text', 'a', 0, 1 ], [ 'name', 'hi', 1, 7 ], [ 'text', 'b ', 7, 9 ] ],
			  'a\n{{hi}} b \n'                          : [ [ 'text', 'a\n', 0, 2 ], [ 'name', 'hi', 2, 8 ], [ 'text', ' b \n', 8, 12 ] ],
			  'a\n {{hi}} \nb'                          : [ [ 'text', 'a\n ', 0, 3 ], [ 'name', 'hi', 3, 9 ], [ 'text', ' \nb', 9, 12 ] ],
			  'hello {{ firstName }} {{ lastName }}!'	: [ [ 'text', 'hello ', 0, 6 ], [ 'name', 'firstName', 6, 21 ], [ 'text', ' ', 21, 22 ], [ 'name', 'lastName', 22, 36 ], [ 'text', '!', 36, 37 ] ]
	};
	
	it('invalidArrayTags',function(done){
		try {
			new TestedClass(["{{"]);
			done('Expected error.');
		} catch( e ) {
			done();
		}
	});
	
	it('invalidStringTags',function(done){
		try {
			new TestedClass('{{');
			done('Expected error.');
		} catch( e ) {
			done();
		}
	});
	
	it('stringTags',function(){
		var oTested = new TestedClass("{{ }}");
		var oActual = oTested.parseToTokens( '{{hi}}'  );
		assert.deepEqual( oActual, [ [ 'name', 'hi', 0, 6 ] ] );
		
		oTested = new TestedClass("<< >>");
		oActual = oTested.parseToTokens( '<<hi>>'  );
		assert.deepEqual( oActual, [ [ 'name', 'hi', 0, 6 ] ] );
		
		oTested = new TestedClass("(( ))");
		oActual = oTested.parseToTokens( '((hi))'  );
		assert.deepEqual( oActual, [ [ 'name', 'hi', 0, 6 ] ] );
		
		oTested = new TestedClass("[[ ]]");
		oActual = oTested.parseToTokens( '[[hi]]'  );
		assert.deepEqual( oActual, [ [ 'name', 'hi', 0, 6 ] ] );
	});
			  

	describe('basic',function(){
		var oTested = new TestedClass();
		for (var template in expectations) {
			(function (template, tokens) {
				it('knows how to parse ' + JSON.stringify(template), function () {
					assert.deepEqual(oTested.parseToTokens(template), tokens);
				});
		    })(template, expectations[template]);
		}
	});
	
	it('simpleToken',function(done){
    	var oTested = new TestedClass();
    	var oActual = oTested.parseToTokens( "hello {{ firstName }}!" );
    	//console.dir( oActual );
    	assert.isNotNull( oActual );
    	assert.isArray( oActual );
    	assert.equal( 3, oActual.length );
    	var t = oActual[1];
    	assert.equal( "name", t[0] );
    	assert.equal( "firstName", t[1] );
    	
    	done();
	});
	
	it('missingClosingTag',function(done){
    	var oTested = new TestedClass();
    	try {
    		oTested.parseToTokens( "hello {{ firstName !" );
    		done("Expecting error because of missing end tag }}.")
    	} catch (e) {
    		//console.log(e);
    		done();
    	}
	});
	
});
