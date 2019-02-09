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
	
	it('collect_results_across_step', function(done) {
		var oExecutor = new function() {};
    	var oSettings = {};
    	var oTested = new TestedClass( oExecutor, oSettings );
    	var oReporter = new (require('./etl/collect'))( oTested );
    	
    	var oETL = {
    			etl: ['step1','step2'],
    			step1: {
    				collector: {
    					doSomething: {
    						result: "a"
    					},
    					doSomethingElse: {
    						result: "b"
    					},
    					andSomethingElse: {
    						result: "c"
    					}
    				}
    			},
    			step2: {
    				collector: {
    					doSomething: {
    						result: "d"
    					},
    					doSomethingElse: {
    						result: "e"
    					},
    					andSomethingElse: {
    						result: "f"
    					}
    				}
    			}
    	};
		oTested.process( oETL ).then(function( pData ) {
			assert.sameOrderedMembers(['a','b','c','d','e','f'], pData);
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
	});
	
	it('collect_results_within_step', function(done) {
		var oExecutor = new function() {};
    	var oSettings = {};
    	var oTested = new TestedClass( oExecutor, oSettings );
    	var oReporter = new (require('./etl/collect'))( oTested );
    	
    	var oETL = {
    			etl: ['step1'],
    			step1: {
    				collector: {
    					doSomething: {
    						result: "a"
    					},
    					doSomethingElse: {
    						result: "b"
    					},
    					andSomethingElse: {
    						result: "c"
    					}
    				}
    			}
    	};
		oTested.process( oETL ).then(function( pData ) {
			assert.sameOrderedMembers(['a','b','c'], pData);
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
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