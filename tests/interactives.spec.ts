import { assert } from "chai";
import InteractivesMod from "../lib/interactives";
import { EventEmitter } from "events";
import { IETL, ModCallback } from "../lib/etl";
import Mod from "../lib/mod";
import Context, { emptyContext } from "../lib/context";
import { NoOpExecutor } from "../lib/executors";

// const chai = require("chai");
// const spies = require("chai-spies");
// chai.use(spies);

describe("interactives", function() {
  const NOOP_EXEC = new NoOpExecutor();

  class ETLMock implements IETL {
    mod(_pKey: string, _pSource: Mod, pCallback: ModCallback): void {
      pCallback({ test: true });
    }
    processActivity(
      _pActivityIndex: number,
      _pTotalActivities: number,
      _pActivityId: string,
      _pActivity: any,
      _pPreviousActivityData: any,
      _pResults: any,
      _pContext: any
    ): Promise<any> {
      return Promise.resolve();
    }
  }
  class FakeStream extends EventEmitter {
    read(): any {
      return {};
    }
    pause(): this {
      return this;
    }
    resume(): this {
      return this;
    }
    write(): boolean {
      return true;
    }
    end(): void {
      // nop
    }
  }

  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
  });

  it("register", function(done) {
    const oTested = new InteractivesMod();
    oTested.register(new ETLMock());
    assert.deepEqual(oTested.mSettings, { test: true });
    done();
  });

  it("questionError", function(done) {
    const oTested = new InteractivesMod(new ETLMock());
    oTested._exec = function() {
      return function() {
        return Promise.reject(
          new Error("Error generated for testing purposes.")
        );
      };
    };
    const oTemplate = {
      root: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        ask_name: {
          prompt: "Enter your name"
        }
      }
    };
    oTested.handle("root", oTemplate["root"], NOOP_EXEC, emptyContext()).then(
      function() {
        done("Expected error");
      },
      function() {
        done();
      }
    );
  });

  it("execError", function(done) {
    const oTested = new InteractivesMod(new ETLMock());
    oTested._exec = function() {
      throw new Error("Error generated for testing purposes.");
    };
    const oTemplate = {
      root: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        ask_name: {
          prompt: "Enter your name"
        }
      }
    };
    oTested.handle("root", oTemplate["root"], NOOP_EXEC, emptyContext()).then(
      function() {
        done("Expected error");
      },
      function() {
        done();
      }
    );
  });

  it("basic", function(done) {
    const fs = new FakeStream();
    const oSettings = { input: fs, output: fs };
    const oTested = new InteractivesMod(oSettings);

    const oTemplate = {
      root: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        ask_name: {
          prompt: "Enter your name",
          var: "name"
        }
      }
    };
    const oContext: Context = emptyContext();
    oTested.handle("root", oTemplate["root"], NOOP_EXEC, oContext).then(
      function() {
        try {
          assert.exists(oContext.vars["name"]);
          assert.equal(oContext.vars["name"], "Schwarzenegger");
          done();
        } catch (e) {
          done(e);
        }
      },
      function(pError) {
        // console.log( pError );
        done(pError);
      }
    );
    setTimeout(function() {
      fs.emit("data", "Schwarzenegger\n");
    }, 10);
  });
});
