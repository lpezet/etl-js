const assert = require('chai').assert
const sinon = require('sinon');
const TestedClass = require('../../lib/templating/writer');

describe('writer',function(){
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});

	it('basic',function(done){
    	var oTested = new TestedClass();
    	var oTokens = [ [ 'text', 'hello world!', 0, 12 ] ];
    	var oActual = oTested.renderTokens( oTokens )
    	assert.isNotNull( oActual );
    	assert.isArray( oActual );
    	assert.deepEqual( [ 'hello world!' ], oActual);
    	done();
	});
	
	it('simpleToken',function(done){
    	var oTested = new TestedClass();
    	var oTokens = [ [ 'text', 'hello ', 0, 6 ],
    		  [ 'name', 'firstName', 6, 21 ],
    		  [ 'text', '!', 21, 22 ] ];
    	
    	var oActual = oTested.renderTokens( oTokens, { firstName: 'Mr. Anderson' } )
    	assert.isNotNull( oActual );
    	assert.isArray( oActual );
    	assert.deepEqual( [ 'hello Mr. Anderson!' ], oActual);
    	done();
	});
	
	it('multipleTokens',function(done){
    	
    	var oTested = new TestedClass();
    	var oTokens = [ [ 'text', 'hello ', 0, 6 ],
    		  [ 'name', 'firstName', 6, 21 ],
    		  [ 'text', ' ', 21, 22 ],
    		  [ 'name', 'lastName', 22, 36 ],
    		  [ 'text', '!', 36, 37 ] ];
    	var oActual = oTested.renderTokens( oTokens, { firstName: 'Mr.', lastName: 'Anderson' } );
    	assert.isNotNull( oActual );
    	assert.isArray( oActual );
    	assert.deepEqual( [ 'hello Mr. Anderson!' ], oActual);
    	done();
	});
	
	it('arrayTokens',function(done){
    	
    	var oTested = new TestedClass();
    	var oTokens = [ [ 'text', 'hello ', 0, 6 ],
    		  [ 'name', 'firstName', 6, 21 ],
    		  [ 'text', ' ', 21, 22 ],
    		  [ 'name', 'addresses..line1', 22, 36 ],
    		  [ 'text', '!', 36, 37 ] ];
    	var oContext = { firstName: 'Mr. Anderson', addresses: [ { line1: "123 Street Drive" }, { line1: "456 Camino Street" } ] };
    	var oActual = oTested.renderTokens( oTokens, oContext );
    	assert.isNotNull( oActual );
    	assert.isArray( oActual );
    	assert.deepEqual( [ 'hello Mr. Anderson 123 Street Drive!', 'hello Mr. Anderson 456 Camino Street!' ], oActual);
    	done();
	});
	
	it('tokensArrayValue',function(done){
    	
    	var oTested = new TestedClass();
    	var oTokens = [ [ 'text', 'hello ', 0, 6 ],
    		  [ 'name', 'firstName', 6, 21 ],
    		  [ 'text', ' ', 21, 22 ],
    		  [ 'name', 'addresses', 22, 31 ],
    		  [ 'text', '!', 31, 32 ] ];
    	var oContext = { firstName: 'Mr. Anderson', addresses: [ "123 Street Drive", "456 Camino Street" ] };
    	var oActual = oTested.renderTokens( oTokens, oContext );
    	assert.isNotNull( oActual );
    	assert.isArray( oActual );
    	assert.deepEqual( [ 'hello Mr. Anderson 123 Street Drive!', 'hello Mr. Anderson 456 Camino Street!' ], oActual);
    	done();
	});
	
});
