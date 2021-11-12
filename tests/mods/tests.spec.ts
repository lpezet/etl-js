import { assert } from "chai";
import TestsMod, { State } from "../../lib/mods/tests";
import { AbstractETL, ETLResult, ETLStatus } from "../../lib/etl";
import Mod, { ModResult } from "../../lib/mod";
import Context, { emptyContext } from "../../lib/context";
import { Executor, NoOpExecutor } from "../../lib/executors";
import { configureLogger } from "../../lib/logger";

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

describe("tests", function() {
  const NOOP_EXEC = new NoOpExecutor();
  class ETLMock extends AbstractETL {
    constructor(
      pExecutors?: { [key: string]: Executor } | Executor,
      pSettings?: any
    ) {
      super(pExecutors || new NoOpExecutor(), pSettings);
    }
    mod(
      _pKey: string,
      _pSource: Mod<any>,
      pCallback?: (settings?: any) => void
    ): void {
      if (pCallback) pCallback({ test: true });
    }
    processTemplate(_pTemplate: any, _pParameters?: any): Promise<ETLResult> {
      return Promise.resolve({ status: ETLStatus.DONE, activities: [] });
    }
  }

  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
  });

  it("register", function(done) {
    const oTested = new TestsMod();
    oTested.register(new ETLMock());
    assert.deepEqual(oTested.mSettings, { test: true });
    done();
  });

  it("tagWrongAssertion", function(done) {
    const oTested = new TestsMod();
    const oContext: Context = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      total_results: 10,
      ...emptyContext()
    };

    const oTemplate = {
      root: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        check_total_results: {
          vars: { total: "{{ total_results }}" },
          assertions: ["total > 0", "total == 123456"]
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: NOOP_EXEC,
        context: oContext
      })
      .then(function(_pResults: ModResult<State>) {
        done(new Error("Expecting error due to wrong assertion."));
      })
      .catch(() => {
        done();
      });
  });

  it("tagSuccessfulAssertion", function(done) {
    const oTested = new TestsMod();
    const oContext: Context = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      total_results: 123456,
      ...emptyContext()
    };

    const oTemplate = {
      root: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        check_total_results: {
          vars: { total: "{{ total_results }}" },
          assertions: ["total == 123456", "total > 0"]
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: NOOP_EXEC,
        context: oContext
      })
      .then(function(_pResults: ModResult<State>) {
        console.log(JSON.stringify(_pResults));
        done();
      })
      .catch((pError: Error) => {
        done(pError);
      });
  });

  it("falseAssertion", function(done) {
    const oTested = new TestsMod();
    const oContext = emptyContext();

    const oTemplate = {
      root: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        check_total_results: {
          vars: { total: "1000" },
          assertions: ["total == 123456", "total > 0"]
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: NOOP_EXEC,
        context: oContext
      })
      .then(function(_pResults: ModResult<State>) {
        // console.log(JSON.stringify(_pResults));
        done(new Error("Expected assertion to fail!"));
      })
      .catch(() => {
        // console.log("Error: ");
        // console.log(JSON.stringify(pError));
        done();
      });
  });

  it("basic", function(done) {
    const oTested = new TestsMod();
    const oContext = emptyContext();

    const oTemplate = {
      root: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        check_total_results: {
          vars: { total: "123456" },
          assertions: ["total == 123456", "total > 0"]
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: NOOP_EXEC,
        context: oContext
      })
      .then(function(_pResults: ModResult<State>) {
        done();
      })
      .catch((pError: Error) => {
        done(pError);
      });
  });
});
