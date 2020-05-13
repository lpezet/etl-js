import { assert } from "chai";
import ETL, { IETL } from "../lib/etl";
import Mod from "../lib/mod";
import TestMod from "./etl/test";
import { Executor } from "../lib/executors";
import Context from "../lib/context";
import ModMod from "./etl/mod";

describe("etl", function() {
  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
  });

  /**
   * @param pETL etl
   * @param pMod mod
   * @param pSettings settings
   * @return Promise<Mod>
   */
  function registerMod(
    pETL: IETL,
    pMod: string,
    pSettings?: any
  ): Promise<Mod> {
    return import(pMod).then(m => {
      if (m["default"]) m = m.default;
      const Factory = m.bind.apply(m, [null, pETL, pSettings || {}]);
      return new Factory() as Mod;
    });
  }

  it("etlSets", function(done) {
    const oExecutor: any = {};
    const oTested = new ETL(oExecutor);
    const oTester = new TestMod(oTested);

    const oETL = {
      etlSets: {
        mySet: ["abc"]
      },
      abc: {
        tester: {
          dontmatter: true
        }
      }
    };
    oTested.process(oETL, { etlSet: "mySet" }).then(
      function() {
        try {
          assert.equal(1, oTester.calls());
          done();
        } catch (pError) {
          done(pError);
        }
      },
      function(pError: Error) {
        done(pError);
      }
    );
  });

  it("invalidETLSet", function(done) {
    const oExecutor: any = {};
    const oTested = new ETL(oExecutor);
    let oTester: TestMod;
    registerMod(oTested, "./etl/test")
      .then(mod => {
        oTester = mod as TestMod;
        return mod;
      })
      .then(() => {
        const oETL = {
          etlSets: {
            mySet: ["abc"]
          },
          abc: {
            tester: {
              dontmatter: true
            }
          }
        };
        oTested.process(oETL, { etlSet: "unknown" }).then(
          function() {
            try {
              assert.equal(0, oTester.calls());
              done();
            } catch (pError) {
              done(pError);
            }
          },
          function(pError: Error) {
            done(pError);
          }
        );
      });
  });

  it("resolve_etlsets", function() {
    const oExecutor: any = {};
    const oTested = new ETL(oExecutor);

    const oSimpleNoRefETLSets = {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      default: ["activity4"]
    };

    const oSimpleRefETLSets = {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      default: [{ etlSet: "prepare" }, { etlSet: "process" }, "activity4"]
    };

    const oDeepRefETLSets = {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      report: [{ etlSet: "prepare" }, "activity5"],
      default: [
        { etlSet: "prepare" },
        { etlSet: "process" },
        "activity4",
        { etlSet: "report" }
      ]
    };

    const oInfiniteLoopRefETLSets = {
      sanity: ["activity1"],
      loop: [{ etlSet: "default" }],
      default: [{ etlSet: "loop" }]
    };

    let oActual = null;

    oActual = oTested._resolveEtlSets(oSimpleNoRefETLSets);
    assert.deepEqual(oActual, {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      default: ["activity4"]
    });

    oActual = oTested._resolveEtlSets(oSimpleRefETLSets);
    assert.deepEqual(oActual, {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      default: ["activity1", "activity2", "activity3", "activity4"]
    });

    oActual = oTested._resolveEtlSets(oDeepRefETLSets);
    assert.deepEqual(oActual, {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      report: ["activity1", "activity2", "activity5"],
      default: [
        "activity1",
        "activity2",
        "activity3",
        "activity4",
        "activity1",
        "activity2",
        "activity5"
      ]
    });

    assert.throws(function() {
      oTested._resolveEtlSets(oInfiniteLoopRefETLSets);
    });
  });

  it("skip", function(done) {
    class SkipModClass implements Mod {
      constructor(pETL: IETL) {
        pETL.mod("skipMod", this);
      }
      handle(
        _pParent: string,
        _pConfig: any,
        _pExecutor: Executor,
        _pContext: Context
      ): Promise<any> {
        return new Promise(function(resolve, _reject) {
          resolve({ skip: true });
        });
      }
    }

    const oExecutor: any = {};
    const oTested = new ETL(oExecutor);
    new SkipModClass(oTested);
    let oTester: TestMod;
    let oModder: ModMod;
    registerMod(oTested, "./etl/test")
      .then(mod => {
        oTester = mod as TestMod;
        return registerMod(oTested, "./etl/mod");
      })
      .then(mod => {
        oModder = mod as ModMod;
        return mod;
      })
      .then(() => {
        const oETL = {
          etl: ["abc", "def"],
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

        oTested.process(oETL).then(
          function() {
            try {
              assert.equal(2, oTester.calls());
              assert.equal(0, oModder.calls());
              done();
            } catch (pError) {
              done(pError);
            }
          },
          function(pError: Error) {
            // console.log( pError );
            done(pError);
          }
        );
      });
  });

  it("exit", function(done) {
    class ModClass implements Mod {
      constructor(pETL: IETL) {
        pETL.mod("exitMod", this);
      }
      handle(
        _pParent: string,
        _pConfig: any,
        _pExecutor: Executor,
        _pContext: Context
      ): Promise<any> {
        return new Promise(function(resolve, _reject) {
          resolve({ exit: true });
        });
      }
    }
    const oExecutor: any = {};
    const oTested = new ETL(oExecutor);
    new ModClass(oTested);
    let oModder: ModMod;
    let oTester: TestMod;
    registerMod(oTested, "./etl/test")
      .then(mod => {
        oTester = mod as TestMod;
        return registerMod(oTested, "./etl/mod");
      })
      .then(mod => {
        oModder = mod as ModMod;
        return mod;
      })
      .then(() => {
        const oETL = {
          etl: ["abc", "def"],
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
        oTested.process(oETL).then(
          function(_pData: any) {
            try {
              assert.equal(1, oTester.calls());
              assert.equal(0, oModder.calls());
              done();
            } catch (e) {
              done(e);
            }
          },
          function(pError: Error) {
            done(pError);
          }
        );
      });
  });

  it("envVariables", function(done) {
    class ModClass {
      mEnvKey: string;
      mEnvValue: any;
      constructor(pETL: IETL, pEnvKey: string) {
        pETL.mod("enver", this);
        this.mEnvKey = pEnvKey;
        this.mEnvValue = undefined;
      }
      envValue(): any {
        return this.mEnvValue;
      }
      handle(
        _pParent: string,
        _pConfig: any,
        _pExecutor: Executor,
        pContext: Context
      ): Promise<any> {
        try {
          assert.exists(pContext["env"][this.mEnvKey]);
          assert.equal(pContext["env"][this.mEnvKey], "world");
          return Promise.resolve({});
        } catch (e) {
          return Promise.reject(
            new Error("context should hold key " + this.mEnvKey + ".")
          );
        }
        // resolve( { 'enver': { error: null, result: pContext['env'][ that.mEnvKey ] } } );
        // resolve(  );
      }
    }
    const oExecutor: any = {};
    const oTested = new ETL(oExecutor);
    new ModClass(oTested, "hello");
    const oETL = {
      etl: ["abc"],
      abc: {
        enver: {
          dontmatter: true
        }
      }
    };
    process.env["hello"] = "world";
    oTested.process(oETL).then(
      function(_pData: any) {
        done();
      },
      function(pError: Error) {
        done(pError);
      }
    );
  });

  it("errorRegisteringModMoreThanOnce", function(done) {
    const oExecutor: any = {};
    const oSettings = {};
    const oTested = new ETL(oExecutor, oSettings);
    let caught = false;
    registerMod(oTested, "./etl/collect")
      .then(_mod => {
        return registerMod(oTested, "./etl/collect");
      })
      .catch((_err: Error) => {
        caught = true;
        done();
      })
      .finally(() => {
        if (!caught) done("Expected error registering twice same mod.");
      });
  });

  it("events", function(done) {
    const EXPECTED_ACTIVITIES = ["step1", "step2", "step999", "step3"];

    const oExecutor: any = {};
    const oSettings = {};
    const oTested = new ETL(oExecutor, oSettings);
    registerMod(oTested, "./etl/collect").then(() => {
      const oETL = {
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
      const oActualActivitiesDone: string[] = [];
      oTested.on("activityDone", function(pId, _pError, _pData) {
        oActualActivitiesDone.push(pId);
      });
      oTested.process(oETL).then(
        function(_pData: any) {
          try {
            assert.deepEqual(oActualActivitiesDone, EXPECTED_ACTIVITIES);
            done();
          } catch (e) {
            done(e);
          }
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
    });
  });

  it("mod_throwing_error", function(done) {
    const oExecutor: any = {};
    const oSettings = {};
    const oTested = new ETL(oExecutor, oSettings);
    class AwesomeMod implements Mod {
      constructor(pETL: IETL) {
        pETL.mod("awesome", this);
      }
      handle(
        _pParent: string,
        _pConfig: any,
        _pExecutor: Executor,
        _pContext: Context
      ): Promise<any> {
        throw new Error("Awesome mod error.");
      }
    }
    new AwesomeMod(oTested);
    const oETL = {
      etl: ["step1", "step2"],
      step1: {
        awesome: {
          doSomething: {
            result: "a"
          }
        }
      }
    };
    oTested.process(oETL).then(
      function(_pData: any) {
        done("Expecting error");
      },
      function(_pError: Error) {
        done();
      }
    );
  });

  it("missing_mod", function(done) {
    const oExecutor: any = {};
    const oSettings = {};
    const oTested = new ETL(oExecutor, oSettings);
    const oETL = {
      etl: ["step1", "step2"],
      step1: {
        collects: {
          doSomething: {
            result: "a"
          }
        }
      }
    };
    oTested.process(oETL).then(
      function(_pData: any) {
        done("Expected error.");
      },
      function() {
        // console.log( pError );
        done();
      }
    );
  });

  it("registering_mod_dynamically", function(done) {
    const oExecutor: any = {};
    const oSettings = {};
    const oTested = new ETL(oExecutor, oSettings);
    assert.equal(Object.keys(oTested.getMods()).length, 0);
    registerMod(oTested, "./etl/mod").then(() => {
      try {
        assert.equal(Object.keys(oTested.getMods()).length, 1);
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  /*
	it('collect_results_across_step', function(done) {
		var oExecutor = new function() {};
    	var oSettings = {};
    	var oTested = new ETL( oExecutor, oSettings );
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
    	var oTested = new ETL( oExecutor, oSettings );
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
    	var oTested = new ETL( oExecutor, oSettings );
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
  it("basic", function(done) {
    const oExecutor: any = {};
    const oSettings = {
      mods: {
        tester: {
          hello: "world"
        },
        moder: {}
      }
    };
    const oTested = new ETL(oExecutor, oSettings);
    let oTester: TestMod;
    let oModder: ModMod;
    registerMod(oTested, "./etl/mod")
      .then(mod => {
        oModder = mod as ModMod;
        return registerMod(oTested, "./etl/test");
      })
      .then(mod => {
        oTester = mod as TestMod;
        return mod;
      })
      .then(() => {
        const oETL = {
          etl: ["abc"],
          abc: {
            tester: {
              dontmatter: true
            },
            moder: {}
          }
        };
        oTested.process(oETL).then(
          function() {
            assert.equal(1, oTester.calls());
            assert.equal(1, oModder.calls());
            done();
          },
          function(pError: Error) {
            // console.log( pError );
            done(pError);
          }
        );
      });
  });
});
