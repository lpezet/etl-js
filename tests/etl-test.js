const TestedClass = require('../lib/etl');
const assert = require('chai').assert;

describe('etl',function(){
	
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});
	
	var register_mod = function( pETL, pMod, pSettings) {
		var Class = require( pMod );
		var Factory = Class.bind.apply(Class, [ null, pETL, pSettings ] );
		return new Factory();
	}
	
	it('mod_throwing_error', function(done) {
		var oExecutor = new function() {};
		var oSettings = {};
		var oTested = new TestedClass( oExecutor, oSettings );
		var oAwesomeMod = function( pETL ) {
			pETL.mod( 'awesome', this );
		};
		oAwesomeMod.prototype.handle = function() {
			throw new Error('Awesome mod error.');
		};
		
		new oAwesomeMod( oTested );
		var oETL = {
    			etl: ['step1','step2'],
    			step1: {
    				awesome: {
    					doSomething: {
    						result: "a"
    					}
    				}
    			}
    	};
		oTested.process( oETL ).then(function( pData ) {
			done('Expecting error');
		}, function( pError ) {
			done();
		});
	});
	
	it('missing_mod', function(done) {
		var oExecutor = new function() {};
		var oSettings = {};
		var oTested = new TestedClass( oExecutor, oSettings );
		var oETL = {
    			etl: ['step1','step2'],
    			step1: {
    				collects: {
    					doSomething: {
    						result: "a"
    					}
    				}
    			}
    	};
		oTested.process( oETL ).then(function( pData ) {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
	});
	
	it('registering_mod_dynamically', function(done) {
		var oExecutor = new function() {};
		var oSettings = {};
		var oTested = new TestedClass( oExecutor, oSettings );
    	assert.equal( Object.keys( oTested.get_mods() ).length, 0);
    	register_mod( oTested, './etl/mod' );
    	assert.equal( Object.keys( oTested.get_mods() ).length, 1 );
    	done();
	});
	
	/*
	it('collect_results_across_step', function(done) {
		var oExecutor = new function() {};
    	var oSettings = {};
    	var oTested = new TestedClass( oExecutor, oSettings );
    	var oReporter = new (require('./etl/collect'))( oTested );
    	
    	var oETL = {
    			etl: ['step1','step2'],
    			step1: {
    				collects: {
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
    				collects: {
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
			console.dir( pData );
			assert.sameOrderedMembers(['a','b','c','d','e','f'], pData);
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
	});
	*/
	it('results', function(done) {
		var oExecutor = new function() {};
    	var oSettings = {};
    	var oTested = new TestedClass( oExecutor, oSettings );
    	new (require('./etl/collect'))( oTested );
    	
    	var oETL = {
    			etl: ['step1','step2'],
    			step1: {
    				collects: {
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
			//console.dir( pData );
			assert.exists( pData );
			assert.exists( pData['etl'] );
			assert.exists( pData['step1'] );
			assert.exists( pData['step1']['collects'] );
			assert.exists( pData['step1']['collects']['doSomething'] );
			assert.equal( pData['step1']['collects']['doSomething']['result'], 'a' );
			assert.exists( pData['step1']['collects']['doSomethingElse'] );
			assert.equal( pData['step1']['collects']['doSomethingElse']['result'], 'b' );
			assert.exists( pData['step1']['collects']['andSomethingElse'] );
			assert.equal( pData['step1']['collects']['andSomethingElse']['result'], 'c' );
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
	});
	/*
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
	*/
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
