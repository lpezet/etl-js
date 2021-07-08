import { assert } from "chai";
import ETL, { ETLResult, ETLStatus, IETL } from "../lib/etl";
import Mod, {
  AbstractMod,
  ModParameters,
  ModResult,
  ModStatus,
  createModResult
} from "../lib/mod";
import TestMod from "./etl/test";
import { Callback, Executor, NoOpExecutor } from "../lib/executors";
import ModMod from "./etl/mod";

/*
import { configureLogger } from "../../lib/logger";

configureLogger({
  appenders: {
    console: { type: "console", layout: { type: "colored" } }
  },
  categories: {
    default: { appenders: ["console"], level: "all" }
  }
});
*/

describe("etl2", function() {
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
  ): Promise<Mod<any>> {
    return import(pMod).then(m => {
      if (m["default"]) m = m.default;
      const Factory = m.bind.apply(m, [null, pSettings || {}]);
      const oMod = new Factory() as Mod<any>;
      oMod.register(pETL);
      return oMod;
    });
  }

  it("etlSetsDefault", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
    const oTested = new ETL(oExecutor);
    const oTester = new TestMod();
    oTester.register(oTested);

    const oETL = {
      etlSets: {
        default: ["abc"]
      },
      abc: {
        tester: {
          dontmatter: true
        }
      }
    };
    oTested.processTemplate(oETL, {}).then(
      function() {
        try {
          assert.equal(oTester.calls(), 1);
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

  it("noEtlSets", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
    const oTested = new ETL(oExecutor);
    const oTester = new TestMod();
    oTester.register(oTested);
    const oETL = {
      abc: {
        tester: {
          dontmatter: true
        }
      }
    };
    oTested.processTemplate(oETL, { etlSet: "mySet" }).then(
      function() {
        try {
          assert.equal(oTester.calls(), 1);
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

  it("etlSets", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
    const oTested = new ETL(oExecutor);
    const oTester = new TestMod();
    oTester.register(oTested);

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
    oTested.processTemplate(oETL, { etlSet: "mySet" }).then(
      function() {
        try {
          assert.equal(oTester.calls(), 1);
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

  it("etlSetsActivityInstead", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
    const oTested = new ETL(oExecutor);
    const oTester = new TestMod();
    oTester.register(oTested);

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
    oTested.processTemplate(oETL, { etlSet: "abc" }).then(
      function() {
        try {
          assert.equal(oTester.calls(), 1);
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

  it("activitiesWithDifferentExecutor", function(done) {
    let oExecCallStack: string[] = [];
    class MyExecClass extends NoOpExecutor {
      mName: string;
      constructor(name: string) {
        super();
        this.mName = name;
      }
      exec(_pCmd: string, _pCmdOptions: any, _pCallback: Callback): void {
        oExecCallStack.push(this.mName);
      }
    }
    class MyModClass extends AbstractMod<any, any> {
      handle({ executor }: ModParameters): Promise<ModResult<any>> {
        executor.exec("", {}, () => {
          // nop
        });
        return Promise.resolve(createModResult(ModStatus.CONTINUE));
      }
    }
    const oExec1: Executor = new MyExecClass("exec1");
    const oExec2: Executor = new MyExecClass("exec2");
    const oExec3: Executor = new MyExecClass("exec3");
    const oExecutors = {
      default: oExec2,
      exec1: oExec1, // non-default one specified in ETL Template specifically
      exec2: oExec2, // default as specified in Executors above
      exec3: oExec3 // default coming from Settings
    };
    const oSettings: { executor?: string } = {
      executor: "exec3"
    };
    const oTested = new ETL(oExecutors, oSettings);
    const oMod: Mod<any> = new MyModClass("execTest");
    oMod.register(oTested);
    const oETL = {
      etlSets: {
        testDefault: "test1",
        testActivityExec: "test2"
      },
      test1: {
        execTest: {}
      },
      test2: {
        executor: "exec1",
        execTest: {}
      }
    };
    oTested
      .processTemplate(oETL, { etlSet: "testDefault" })
      .then(() => {
        assert.isTrue(oExecCallStack.length == 1);
        assert.equal(oExecCallStack[0], "exec3"); // since it's specified in Settings
        oExecCallStack = [];
        delete oSettings.executor;
        return oTested.processTemplate(oETL, { etlSet: "testDefault" });
      })
      .then(() => {
        assert.isTrue(oExecCallStack.length == 1);
        assert.equal(oExecCallStack[0], "exec2"); // since it's specified in Executors under "default"
        oExecCallStack = [];
        return oTested.processTemplate(oETL, { etlSet: "testActivityExec" });
      })
      .then(() => {
        assert.isTrue(oExecCallStack.length == 1);
        assert.equal(oExecCallStack[0], "exec1");
      })
      .then(() => {
        done();
      })
      .catch((e: Error) => {
        done(e);
      });
  });

  it("etlSetsSingleValue", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
    const oTested = new ETL(oExecutor);
    const oTester = new TestMod();
    oTester.register(oTested);

    const oETL = {
      etlSets: {
        mySet: "abc"
      },
      abc: {
        tester: {
          dontmatter: true
        }
      }
    };
    oTested.processTemplate(oETL, { etlSet: "mySet" }).then(
      function() {
        try {
          assert.equal(oTester.calls(), 1);
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
    const oExecutor: Executor = new NoOpExecutor();
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
        oTested.processTemplate(oETL, { etlSet: "unknown" }).then(
          function() {
            try {
              assert.equal(oTester.calls(), 0);
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

  it("disabledMod", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
    const oTested = new ETL(oExecutor);
    const oTester = new TestMod({ disabled: true });
    oTester.register(oTested);
    assert.isTrue(oTester.isDisabled());
    const oETL = {
      etl: ["abc"],
      abc: {
        tester: {}
      }
    };
    oTested.processTemplate(oETL).then(
      function() {
        try {
          assert.equal(oTester.calls(), 0);
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

  it("skip", function(done) {
    class SkipModClass implements Mod<any> {
      isDisabled(): boolean {
        return false;
      }
      register(pETL: IETL): void {
        pETL.mod("skipMod", this);
      }
      handle(_pParams: ModParameters): Promise<ModResult<any>> {
        return new Promise(function(resolve, _reject) {
          resolve(createModResult(ModStatus.STOP));
        });
      }
    }

    const oExecutor: Executor = new NoOpExecutor();
    const oTested = new ETL(oExecutor);
    new SkipModClass().register(oTested);
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

        oTested.processTemplate(oETL).then(
          function() {
            try {
              assert.equal(oTester.calls(), 2);
              assert.equal(oModder.calls(), 0);
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
    class ModClass implements Mod<any> {
      isDisabled(): boolean {
        return false;
      }
      register(pETL: IETL): void {
        pETL.mod("exitMod", this);
      }
      handle(_pParams: ModParameters): Promise<ModResult<any>> {
        return new Promise(function(resolve, _reject) {
          resolve(createModResult(ModStatus.EXIT));
        });
      }
    }
    const oExecutor: Executor = new NoOpExecutor();
    const oTested = new ETL(oExecutor);
    new ModClass().register(oTested);
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
        oTested.processTemplate(oETL).then(
          function(_pData: any) {
            try {
              assert.equal(oTester.calls(), 1);
              assert.equal(oModder.calls(), 0);
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
    class ModClass implements Mod<any> {
      mEnvKey: string;
      mEnvValue: any;
      constructor(pEnvKey: string) {
        this.mEnvKey = pEnvKey;
        this.mEnvValue = undefined;
      }
      isDisabled(): boolean {
        return false;
      }
      register(pETL: IETL): void {
        pETL.mod("enver", this);
      }
      envValue(): any {
        return this.mEnvValue;
      }
      handle({ context }: ModParameters): Promise<ModResult<any>> {
        try {
          assert.exists(context["env"][this.mEnvKey]);
          assert.equal(context["env"][this.mEnvKey], "world");
          return Promise.resolve(createModResult(ModStatus.CONTINUE));
        } catch (e) {
          return Promise.reject(
            new Error("context should hold key " + this.mEnvKey + ".")
          );
        }
        // resolve( { 'enver': { error: null, result: pContext['env'][ that.mEnvKey ] } } );
        // resolve(  );
      }
    }
    const oExecutor: Executor = new NoOpExecutor();
    const oTested = new ETL(oExecutor);
    new ModClass("hello").register(oTested);
    const oETL = {
      etl: ["abc"],
      abc: {
        enver: {
          dontmatter: true
        }
      }
    };
    process.env["hello"] = "world";
    oTested.processTemplate(oETL).then(
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

    const oExecutor: Executor = new NoOpExecutor();
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
      oTested
        .processTemplate(oETL)
        .then(function(_pData: any) {
          try {
            assert.deepEqual(oActualActivitiesDone, EXPECTED_ACTIVITIES);
            done();
          } catch (e) {
            done(e);
          }
        })
        .catch((pError: Error) => {
          done(pError);
        });
    });
  });

  it("modThrowingError", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
    const oSettings = {};
    const oTested = new ETL(oExecutor, oSettings);
    class AwesomeMod implements Mod<any> {
      register(pETL: IETL): void {
        pETL.mod("awesome", this);
      }
      isDisabled(): boolean {
        return false;
      }
      handle(_pParams: ModParameters): Promise<ModResult<any>> {
        throw new Error("Error generated for testing purposes.");
      }
    }
    new AwesomeMod().register(oTested);
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
    oTested.processTemplate(oETL).then(
      function(pData: ETLResult) {
        console.log("## ETLResult: ");
        console.log(pData);
        try {
          assert.equal(pData.status, ETLStatus.EXIT);
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

  it("missingMod", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
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
    oTested
      .processTemplate(oETL)
      .then(function(_pData: any) {
        done(new Error("Expected error."));
      })
      .catch(() => {
        // console.log( pError );
        done();
      });
  });

  it("registeringModDynamically", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
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

  it("newActivitySchema", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
    const oSettings = {};
    const oTested = new ETL(oExecutor, oSettings);
    const oTester = new TestMod();
    oTester.register(oTested);
    const oETL = {
      etlSets: {
        default: ["abc", "def"]
      },
      abc: {
        steps: {
          tester: {}
        }
      },
      def: {
        tester: {}
      }
    };
    oTested.processTemplate(oETL, {}).then(
      function() {
        try {
          assert.equal(oTester.calls(), 2);
          done();
        } catch (pError) {
          done(pError);
        }
      },
      function(pError: Error) {
        console.log(pError);
        done(pError);
      }
    );
  });

  it("newActivitySchemaAdvanced", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
    const oSettings = {};
    const oTested = new ETL(oExecutor, oSettings);
    const oTester = new TestMod();
    oTester.register(oTested);
    const oETL = {
      etlSets: {
        default: ["abc", "def"]
      },
      abc: {
        steps: {
          step0: {
            tester: {}
          }
        }
      },
      def: {
        tester: {}
      }
    };
    oTested.processTemplate(oETL, {}).then(
      function() {
        try {
          assert.equal(oTester.calls(), 2);
          done();
        } catch (pError) {
          done(pError);
        }
      },
      function(pError: Error) {
        console.log(pError);
        done(pError);
      }
    );
  });
  /*
  it("subActivities", function(done) {
    const oExecutor: Executor = new NoOpExecutor();
    const oSettings = {};
    const oTested = new ETL(oExecutor, oSettings);
    const oTester = new TestMod();
    oTester.register(oTested);

    class SubActivitiesMod implements Mod {
      mETL: IETL | null;
      constructor() {
        this.mETL = null;
      }
      register(pETL: IETL): void {
        pETL.mod("subActivities", this);
        this.mETL = pETL;
      }
      isDisabled(): boolean {
        return false;
      }
      handle(
        pParent: string,
        _pConfig: any,
        _pExecutor: Executor,
        pContext: Context
      ): Promise<any> {
        if (!this.mETL) {
          return Promise.reject(new Error("ETL must be set first."));
        }
        const activity = {
          tester: {}
        };
        const oResult: ETLResult = {
          exit: false,
          activities: []
        };
        return this.mETL.processActivity(
          pContext.etl.activityIndex,
          1,
          pParent + ".subActivity",
          activity,
          {},
          oResult,
          pContext
        );
      }
    }
    new SubActivitiesMod().register(oTested);
    const oETL = {
      etlSets: {
        default: ["abc", "def"]
      },
      abc: {
        tester: {},
        subActivities: {}
      },
      def: {
        subActivities: {},
        tester: {}
      }
    };
    oTested.process(oETL, {}).then(
      function() {
        try {
          assert.equal(oTester.calls(), 4);
          done();
        } catch (pError) {
          done(pError);
        }
      },
      function(pError: Error) {
        console.log(pError);
        done(pError);
      }
    );
  });
  */
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
    const oExecutor: Executor = new NoOpExecutor();
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
        oTested.processTemplate(oETL).then(
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
