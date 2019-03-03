const assert = require('chai').assert
const TestedClass = require('../../lib/templating/engine');

describe('engine',function(){
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});
	
	it('basic',function() {
    	var oTested = new TestedClass();
    	var oActual = oTested.evaluate( "hello {{ name }}!", { name: "world" } );
    	console.dir( oActual );
    	assert.isNotNull( oActual );
    	assert.isArray( oActual );
    	assert.deepEqual( [ 'hello world!' ], oActual );
	});
	
	it('basicWithCallback',function(done){
    	var oTested = new TestedClass();
    	oTested.evaluate( "hello {{ name }}!", { name: "world" }, function( err, results ) {
    		if ( err ) {
    			done(err);
    		} else {
    			try {
		    		assert.isNotNull( results );
		        	assert.isArray( results );
		        	assert.deepEqual( [ 'hello world!' ], results );
		        	done();
    			} catch (e) {
    				done(e);
    			}
    		}
    	} );
	});
	
});
