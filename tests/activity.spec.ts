import { assert } from "chai";
import { AbstractETL, ETLResult, ETLStatus, IETL } from "../lib/etl";
import TestMod from "./etl/test";
import CollectMod from "./etl/collect";
import { Executor, NoOpExecutor } from "../lib/executors";
import { ActivityParameters, DefaultActivity } from "../lib/activity";
import { emptyContext } from "../lib/context";
import Mod, {
  AbstractMod,
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

  it("context", function(done) {
    const oETL: IETL = new ETLMock();
    const oCollector = new CollectMod();
    oCollector.register(oETL);
    class MyModClass extends AbstractMod<any, any> {
      mCalled: boolean;
      constructor(pName: string) {
        super(pName);
        this.mCalled = false;
      }
      called(): boolean {
        return this.mCalled;
      }
      handle(pParams: ModParameters): Promise<ModResult<any>> {
        this.mCalled = true;
        const contextKey = pParams.config["key"];
        const contextResult = pParams.context[contextKey];
        return Promise.resolve(
          createModResult(ModStatus.CONTINUE, contextResult)
        );
      }
    }
    const oMod: MyModClass = new MyModClass("contextMod");
    oMod.register(oETL);
    const oTested = new DefaultActivity(oETL);
    const oParams: ActivityParameters = {
      activityId: "activity1",
      activityIndex: 0,
      context: emptyContext(),
      template: {
        collects: {
          collectMe: {
            result: 123,
            var: "result_collected"
          }
        },
        contextMod: {
          key: "result_collected"
        }
      },
      totalActivities: 1
    };
    oTested
      .process(oParams)
      .then(_result => {
        // console.log(JSON.stringify(result));
        // console.log(JSON.stringify(oParams.context));
        // eslint-disable-next-line @typescript-eslint/camelcase
        assert.deepEqual(oParams.context.vars, { result_collected: 123 });
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
