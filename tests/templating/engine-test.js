const assert = require('chai').assert
const TestedClass = require('../../lib/templating/engine');

describe('parser',function(){
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});
	
	it('basic',function(done){
    	var oTested = new TestedClass();
    	var oActual = oTested.evaluate( "hello {{ name }}!", { name: "world" } );
    	console.dir( oActual );
    	assert.isNotNull( oActual );
    	assert.isArray( oActual );
    	assert.deepEqual( [ 'hello world!' ], oActual );
    	done();
	});
	
});
