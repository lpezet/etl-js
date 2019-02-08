const TestedClass = require('../lib/etl');
const load_file = require('./load_file');
const assert = require('chai').assert

describe('etl',function(){
	
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});

	it('basic',function(done){
    	var oExecutor = new function() {};
    	var oSettings = {
    			mods: {
    				"tester": {
    					"hello": "world"
    				},
    				"moder": {
    					
    				}
    			}
    	}
    	var oTested = new TestedClass( oExecutor, oSettings );
    	var oTester = new (require('./etl/test'))( oTested );
    	var oModer = new (require('./etl/mod'))( oTested );
    	
    	var oETL = {
    			etl: [ "abc" ],
    			abc: {
    				tester: {
    					dontmatter: true
    				},
    				moder: {
    					
    				}
    			}
    	};
		oTested.process( oETL ).then(function() {
			assert.equal(1, oTester.calls());
			assert.equal(1, oModer.calls());
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
	});
	
});