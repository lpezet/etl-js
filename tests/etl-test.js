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
	
	it('etlSets', function(done) {
		var oExecutor = new function() {};
    	var oTested = new TestedClass( oExecutor );
    	var oTester = new (require('./etl/test'))( oTested );
		
    	var oETL = {
    			etlSets: {
    				mySet: [ "abc" ]
    			},
    			abc: {
    				tester: {
    					dontmatter: true
    				}
    			}
    	};
    	oTested.process( oETL, { "etlSet": "mySet" } ).then(function() {
    		try {
				assert.equal(1, oTester.calls());
				done();
    		} catch ( pError ) {
    			done( pError );
    		}
		}, function( pError ) {
			done( pError );
		});
	});
	
	it('invalidETLSet', function(done) {
		var oExecutor = new function() {};
    	var oTested = new TestedClass( oExecutor );
    	var oTester = new (require('./etl/test'))( oTested );
		
    	var oETL = {
    			etlSets: {
    				mySet: [ "abc" ]
    			},
    			abc: {
    				tester: {
    					dontmatter: true
    				}
    			}
    	};
    	oTested.process( oETL, { "etlSet": "unknown" } ).then(function() {
    		try {
				assert.equal(0, oTester.calls());
				done();
    		} catch ( pError ) {
    			done( pError );
    		}
		}, function( pError ) {
			done( pError );
		});
	});
	
	it('resolve_etlsets', function() {
		var oExecutor = new function() {};
    	var oTested = new TestedClass( oExecutor );
		
    	var oSimpleNoRefETLSets = {
    			prepare: [ "activity1", "activity2" ],
    			process: [ "activity3" ],
    			default: [ "activity4" ]
    	}
    	
    	var oSimpleRefETLSets = {
    			prepare: [ "activity1", "activity2" ],
    			process: [ "activity3" ],
    			default: [ { etlSet: "prepare" }, { etlSet: "process" }, "activity4" ]
    	}
    	
    	var oDeepRefETLSets = {
    			prepare: [ "activity1", "activity2" ],
    			process: [ "activity3" ],
    			report: [ { etlSet: "prepare" }, "activity5" ],
    			default: [ { etlSet: "prepare" }, { etlSet: "process" }, "activity4", { etlSet: "report" } ]
    	}
    	
    	var oInfiniteLoopRefETLSets = {
    			sanity: [ "activity1" ],
    			loop: [ { etlSet: "default" } ],
    			default: [ { etlSet: "loop" } ]
    	}
    	
    	var oActual = null;
    	
    	oActual = oTested._resolve_etlsets( oSimpleNoRefETLSets );
    	assert.deepEqual( oActual, {"prepare":["activity1","activity2"],"process":["activity3"],"default":["activity4"]} );
    	
    	oActual = oTested._resolve_etlsets( oSimpleRefETLSets );
    	assert.deepEqual( oActual, {"prepare":["activity1","activity2"],"process":["activity3"],"default":["activity1","activity2","activity3","activity4"]} );
    	
    	oActual = oTested._resolve_etlsets( oDeepRefETLSets );
    	assert.deepEqual( oActual, {"prepare":["activity1","activity2"],"process":["activity3"],"report":["activity1","activity2","activity5"],"default":["activity1","activity2","activity3","activity4","activity1","activity2","activity5"]} );
    	
    	assert.throws( function() { oTested._resolve_etlsets( oInfiniteLoopRefETLSets ) });
    });
	
	it('skip', function(done) {
		var SkipModClass = function( pETL ) {
			pETL.mod( 'skipMod', this );
		};
		SkipModClass.prototype.handle = function( pParent, pConfig, pExecutor, pActivityResult, pGlobalResult, pContext ) {
			return new Promise( function( resolve, reject ) {
				resolve( { skip: true } );
			});
		};
		
		var oExecutor = new function() {};
    	var oTested = new TestedClass( oExecutor );
		new SkipModClass( oTested );
    	var oModer = new (require('./etl/mod'))( oTested );
    	var oTester = new (require('./etl/test'))( oTested );
		
    	var oETL = {
    			etl: [ "abc","def" ],
    			abc: {
    				tester: {
    					dontmatter: true
    				},
    				skipMod: {
    					dontmatter: true
    				},
    				moder: {}
    			},
    			def: {
    				tester: {
    					dontmatteragain: true
    				}
    			}
    	};
    	
    	oTested.process( oETL ).then(function() {
    		try {
				assert.equal(2, oTester.calls());
				assert.equal(0, oModer.calls());
				done();
    		} catch ( pError ) {
    			done( pError );
    		}
		}, function( pError ) {
			//console.log( pError );
			done( pError );
		});
	});
	
	it('exit', function(done) {
		var ModClass = function( pETL ) {
			pETL.mod( 'exitMod', this );
		};
		ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pActivityResult, pGlobalResult, pContext ) {
			return new Promise( function( resolve, reject ) {
				resolve( { exit: true } );
			});
		};
		var oExecutor = new function() {};
    	var oTested = new TestedClass( oExecutor );
    	new ModClass( oTested );
    	var oModer = new (require('./etl/mod'))( oTested );
    	var oTester = new (require('./etl/test'))( oTested );
		
    	var oETL = {
    			etl: [ "abc","def" ],
    			abc: {
    				tester: {
    					dontmatter: true
    				},
    				exitMod: {
    					dontmatter: true
    				},
    				moder: {}
    			},
    			def: {
    				tester: {
    					dontmatteragain: true
    				}
    			}
    	};
    	oTested.process( oETL ).then(function( pData ) {
			try {
				assert.equal(1, oTester.calls());
				assert.equal(0, oModer.calls());
				done();
			} catch (e) {
				done(e);
			}
		}, function( pError ) {
			done( pError );
		});
	});
	
	it('envVariables', function(done) {
		var ModClass = function( pETL, pEnvKey ) {
			pETL.mod( 'enver', this );
			this.mEnvKey = pEnvKey;
			this.mEnvValue = undefined;
		};
		ModClass.prototype.envValue = function() {
			return this.mEnvValue;
		}
		ModClass.prototype.handle = function( pParent, pConfig, pExecutor, pContext ) {
			var that = this;
			return new Promise( function( resolve, reject ) {
				try {
					assert.exists( pContext['env'][ that.mEnvKey ] );
					assert.equal( pContext['env'][ that.mEnvKey ], 'world' );
					resolve({});
				} catch(e) {
					reject(new Error("context should hold key " + that.mEnvKey + "."));
				}
				//resolve( { 'enver': { error: null, result: pContext['env'][ that.mEnvKey ] } } );
				//resolve(  );
			});
		}
		var oExecutor = new function() {};
    	var oTested = new TestedClass( oExecutor );
    	new ModClass( oTested, 'hello' );
    	var oETL = {
    			etl: [ "abc" ],
    			abc: {
    				enver: {
    					dontmatter: true
    				}
    			}
    	};
    	process.env['hello'] = 'world';
		oTested.process( oETL ).then(function( pData ) {
			done();
		}, function( pError ) {
			done( pError );
		});
	})
	
	it('errorRegisteringModMoreThanOnce', function(done) {
		var oExecutor = new function() {};
    	var oSettings = {};
    	var oTested = new TestedClass( oExecutor, oSettings );
    	var oMod = require('./etl/collect');
    	new oMod( oTested );
    	try {
    		new oMod( oTested );
    		done('Expected error registering twice same mod.');
    	} catch(e) {
    		done();
    	}
	});
	
	it('events', function(done) {
		const EXPECTED_ACTIVITIES = ['step1','step2', 'step999', 'step3'];
		
		var oExecutor = new function() {};
    	var oSettings = {};
    	var oTested = new TestedClass( oExecutor, oSettings );
    	new (require('./etl/collect'))( oTested );
    	var oETL = {
    			etl: EXPECTED_ACTIVITIES,
    			step1: {
    				collects: {
    					doSomething: {
    						result: "a"
    					}
    				}
    			},
    			step2: {
    				collects: {
    					doSomethingElse: {
    						result: "b"
    					}
    				}
    			},
    			step3: {
    				collects: {
    					something: {
    						result: "d"
    					}
    				}
    			},
    			step999: {
    				collects: {
    					andSomethingElse: {
    						result: "c"
    					}
    				}
    			}
    	};
    	const oActualActivitiesDone = [];
    	oTested.on('activityDone', function( pId, pError, pData ) {
    		oActualActivitiesDone.push( pId );
    	});
		oTested.process( oETL ).then(function( pData ) {
			try {
				assert.deepEqual( oActualActivitiesDone, EXPECTED_ACTIVITIES );
				done();
			} catch(e) {
				done(e);
			}
		}, function( pError ) {
			//console.log( pError );
			done( pError );
		});
	});
	
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
			//console.log( pError );
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
	
	/*
	 * TODO: Tabling this for later, when results structure is more stable.
	 */
	/*
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
			try {
				//console.log('data=');
				//console.log(JSON.stringify( pData ));
				
				assert.exists( pData );
				
				assert.isNotNull( pData );
				assert.isNotNull( pData['results'] );
				assert.equal( pData['results'].length, 1);
				assert.deepEqual( pData['results'][0], {"activity":"step1","result":{"collects":{"doSomething":{"result":"a"},"doSomethingElse":{"result":"b"},"andSomethingElse":{"result":"c"}}}});
				
				done();
			} catch ( pError ) {
				done( pError );
			}
		}, function( pError ) {
			console.log( pError );
			done( pError );
		});
	});
	*/
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
			//console.log( pError );
			done( pError );
		});
	});
	
});
