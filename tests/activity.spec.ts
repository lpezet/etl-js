import { assert } from "chai";
import { AbstractETL, ETLResult, ETLStatus, IETL } from "../lib/etl";
import TestMod from "./etl/test";
import { Executor, NoOpExecutor } from "../lib/executors";
import {
  ActivityParameters,
  ActivityStatus,
  DefaultActivity
} from "../lib/activity";
import { emptyContext } from "../lib/context";
import Mod, {
  ModParameters,
  ModResult,
  ModStatus,
  createModResult
} from "../lib/mod";
import { configureLogger } from "../lib/logger";
if (process.env.DEBUG) {
  configureLogger({
    appenders: {
      console: { type: "console", layout: { type: "colored" } }
    },
    categories: {
      default: { appenders: ["console"], level: "all" }
    }
  });
}
describe("activity", function() {
  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
  });

  class ETLMock extends AbstractETL {
    constructor(
      pExecutors?: { [key: string]: Executor } | Executor,
      pSettings?: any
    ) {
      super(pExecutors || new NoOpExecutor(), pSettings);
    }
    /*
    mod(
      _pKey: string,
      _pSource: Mod<any>,
      pCallback?: (settings?: any) => void
    ): void {
      if (pCallback) pCallback({ test: true });
    }
    */
    processTemplate(_pTemplate: any, _pParameters?: any): Promise<ETLResult> {
      return Promise.resolve({ status: ETLStatus.DONE, activities: [] });
    }
  }

  it("basic", function(done) {
    const oETL: IETL = new ETLMock();
    const oTester = new TestMod();
    oTester.register(oETL);
    const oTested = new DefaultActivity(oETL);
    const oParams: ActivityParameters = {
      activityId: "activity1",
      activityIndex: 0,
      context: emptyContext(),
      template: {
        tester: {
          dontmatter: true
        }
      },
      totalActivities: 1
    };
    oTested
      .process(oParams)
      .then(result => {
        assert.deepEqual(result, {
          id: "activity1",
          status: 0,
          state: { tester: { status: 0, state: undefined, error: undefined } }
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it("advanced", function(done) {
    const oETL: IETL = new ETLMock();
    class StoppableMod implements Mod<any> {
      mCalled = 0;
      register(pETL: IETL): void {
        pETL.mod("stoppable", this);
        pETL.mod("stoppable2", this);
        pETL.mod("stoppable3", this);
      }
      isDisabled(): boolean {
        return false;
      }
      get called(): number {
        return this.mCalled;
      }
      handle(pParams: ModParameters): Promise<ModResult<any>> {
        this.mCalled++;
        if (pParams.config["stop"]) {
          return Promise.resolve(createModResult(ModStatus.STOP));
        }
        return Promise.resolve(createModResult(ModStatus.CONTINUE));
      }
    }
    new StoppableMod().register(oETL);
    const oTested = new DefaultActivity(oETL);

    const oParams: ActivityParameters = {
      activityId: "activity1",
      activityIndex: 0,
      context: emptyContext(),
      template: {
        stoppable: {
          stop: false
        },
        stoppable2: {
          stop: true
        },
        stoppable3: {
          stop: false
        }
      },
      totalActivities: 1
    };
    oTested
      .process(oParams)
      .then(result => {
        assert.deepEqual(result, {
          id: "activity1",
          status: ActivityStatus.STOP,
          state: {
            stoppable: {
              status: ModStatus.CONTINUE,
              state: undefined,
              error: undefined
            },
            stoppable2: {
              status: ModStatus.STOP,
              state: undefined,
              error: undefined
            }
          }
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it("resumeFromState", function(done) {
    const oState = {
      id: "activity1",
      status: ActivityStatus.STOP,
      state: {
        stoppable: {
          status: ModStatus.CONTINUE,
          state: undefined,
          error: undefined
        },
        stoppable2: {
          status: ModStatus.STOP,
          state: undefined,
          error: undefined
        }
      }
    };
    const oETL: IETL = new ETLMock();
    class StoppableMod implements Mod<any> {
      mCalled = 0;
      register(pETL: IETL): void {
        pETL.mod("stoppable", this);
        pETL.mod("stoppable2", this);
        pETL.mod("stoppable3", this);
      }
      isDisabled(): boolean {
        return false;
      }
      get called(): number {
        return this.mCalled;
      }
      handle(pParams: ModParameters): Promise<ModResult<any>> {
        this.mCalled++;
        if (pParams.config["stop"]) {
          return Promise.resolve(createModResult(ModStatus.STOP));
        }
        return Promise.resolve(createModResult(ModStatus.CONTINUE));
      }
    }
    new StoppableMod().register(oETL);
    const oTested = new DefaultActivity(oETL);

    const oParams: ActivityParameters = {
      activityId: "activity1",
      activityIndex: 0,
      context: emptyContext(),
      template: {
        stoppable: {
          stop: true // here making sure it's skipped anyway!
        },
        stoppable2: {
          stop: false
        },
        stoppable3: {
          stop: false
        }
      },
      state: oState,
      totalActivities: 1
    };
    oTested
      .process(oParams)
      .then(result => {
        assert.deepEqual(result, {
          id: "activity1",
          status: ActivityStatus.STOP,
          state: {
            stoppable: {
              status: ModStatus.CONTINUE,
              state: undefined,
              error: undefined
            },
            stoppable2: {
              status: ModStatus.CONTINUE,
              state: undefined,
              error: undefined
            },
            stoppable3: {
              status: ModStatus.CONTINUE,
              state: undefined,
              error: undefined
            }
          }
        });
        done();
      })
      .catch(err => {
        done(err);
      });
  });

  it("modThrowsException", function(done) {
    const oETL: IETL = new ETLMock();
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
    new AwesomeMod().register(oETL);
    const oTested = new DefaultActivity(oETL);
    const oParams: ActivityParameters = {
      activityId: "activity1",
      activityIndex: 0,
      context: emptyContext(),
      template: {
        awesome: {
          dontmatter: true
        }
      },
      totalActivities: 1
    };
    oTested
      .process(oParams)
      .then(
        () => {
          // console.log(result);
          // assert.equal(result.status, ActivityStatus.ERROR);
          // assert.isNotNull(result.error);
          done(new Error("Expected Promise.reject()."));
        },
        () => {
          done();
        }
      )
      .catch(() => {
        done(new Error("Expected Promise.reject() instead of thrown error."));
      });
  });

  it("invalidExecutor", function(done) {
    const oETL: IETL = new ETLMock();
    const oTested = new DefaultActivity(oETL);
    const oParams: ActivityParameters = {
      activityId: "activity1",
      activityIndex: 0,
      context: emptyContext(),
      template: {
        executor: "somethingthatdoesnotexist",
        awesome: {
          dontmatter: true
        }
      },
      totalActivities: 1
    };
    oTested
      .process(oParams)
      .then(
        () => {
          done(new Error("Expected Promise.reject()."));
        },
        () => {
          done();
        }
      )
      .catch(() => {
        done(new Error("Expected Promise.reject() instead of thrown error."));
      });
  });

  it("unknownMod", function(done) {
    const oETL: IETL = new ETLMock();
    const oTested = new DefaultActivity(oETL);
    const oParams: ActivityParameters = {
      activityId: "activity1",
      activityIndex: 0,
      context: emptyContext(),
      template: {
        awesome: {
          dontmatter: true
        }
      },
      totalActivities: 1
    };
    oTested
      .process(oParams)
      .then(
        () => {
          done(new Error("Expected Promise.reject()."));
        },
        () => {
          done();
        }
      )
      // TODO: should it just be a rejection???
      .catch(() => {
        done(new Error("Expected Promise.reject() instead of thrown error."));
      });
  });
});
