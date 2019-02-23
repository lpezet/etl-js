const assert = require('chai').assert
const sinon = require('sinon');
const TestedClass = require('../../lib/templating/parser');

describe('parser',function(){
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});

	it('basic',function(done){
    	
    	var oTested = new TestedClass();
    	var oActual = oTested.parseToTokens( "hello world!" );
    	console.dir( oActual );
    	assert.isNotNull( oActual );
    	assert.isArray( oActual );
    	assert.equal( 1, oActual.length );
    	var t = oActual[0];
    	assert.equal( "text", t[0] );
    	assert.equal( "hello world!", t[1] );
    	done();
	});
	
	it('simpleToken',function(done){
    	
    	var oTested = new TestedClass();
    	var oActual = oTested.parseToTokens( "hello {{ firstName }}!" );
    	console.dir( oActual );
    	assert.isNotNull( oActual );
    	assert.isArray( oActual );
    	assert.equal( 3, oActual.length );
    	var t = oActual[1];
    	assert.equal( "name", t[0] );
    	assert.equal( "firstName", t[1] );
    	
    	done();
	});
	
	it('multipleTokens',function(done){
    	
    	var oTested = new TestedClass();
    	var oActual = oTested.parseToTokens( "hello {{ firstName }} {{ lastName }}!" );
    	console.dir( oActual );
    	assert.isNotNull( oActual );
    	assert.isArray( oActual );
    	assert.equal( 5, oActual.length ); // NB: spaces are included!
    	var t = oActual[1];
    	assert.equal( "name", t[0] );
    	assert.equal( "firstName", t[1] );
    	
    	t = oActual[3];
    	assert.equal( "name", t[0] );
    	assert.equal( "lastName", t[1] );
    	
    	
    	done();
	});
});
