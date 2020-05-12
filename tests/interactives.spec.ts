import { assert } from "chai";
import InteractivesMod from "../lib/interactives";
import { EventEmitter } from "events";
import { IETL, ModCallback } from "../lib/etl";
import Mod from "../lib/mod";
import Context from "../lib/context";
import { NoOpExecutor } from "../lib/executors";

const chai = require("chai");
const spies = require("chai-spies");
chai.use(spies);

describe("interactives", function () {
  const NOOP_EXEC = new NoOpExecutor();
  function emptyContext() {
    return { env: {}, vars: {} };
  }
  class ETLMock implements IETL {
    mod(_pKey: string, _pSource: Mod, pCallback: ModCallback): void {
      pCallback({ test: true });
    }
  }
  class FakeStream extends EventEmitter {
    resume() {}
    pause() {}
    write() {}
    end() {}
  }

  beforeEach(function (done: () => void) {
    done();
  });

  afterEach(function (done: () => void) {
    done();
  });

  it("mod", function (done) {
    var oTested = new InteractivesMod(new ETLMock());
    assert.deepEqual(oTested.mSettings, { test: true });
    done();
  });

  it("questionError", function (done) {
    var oTested = new InteractivesMod(new ETLMock());
    oTested._exec = function () {
      return function () {
        return Promise.reject({ error: new Error("dummy error") });
      };
    };
    var oTemplate = {
      root: {
        ask_name: {
          prompt: "Enter your name",
        },
      },
    };
    oTested.handle("root", oTemplate["root"], NOOP_EXEC, emptyContext()).then(
      function () {
        done("Expected error");
      },
      function () {
        done();
      }
    );
  });

  it("execError", function (done) {
    var oTested = new InteractivesMod(new ETLMock());
    oTested._exec = function () {
      throw new Error("dummy error");
    };
    var oTemplate = {
      root: {
        ask_name: {
          prompt: "Enter your name",
        },
      },
    };
    oTested.handle("root", oTemplate["root"], NOOP_EXEC, emptyContext()).then(
      function () {
        done("Expected error");
      },
      function () {
        done();
      }
    );
  });

  it("basic", function (done) {
    var fs = new FakeStream();
    var oSettings = { input: fs, output: fs };
    var oTested = new InteractivesMod(new ETLMock(), oSettings);

    var oTemplate = {
      root: {
        ask_name: {
          prompt: "Enter your name",
          var: "name",
        },
      },
    };
    const oContext: Context = emptyContext();
    oTested.handle("root", oTemplate["root"], NOOP_EXEC, oContext).then(
      function () {
        try {
          assert.exists(oContext.vars["name"]);
          assert.equal(oContext.vars["name"], "Schwarzenegger");
          done();
        } catch (e) {
          done(e);
        }
      },
      function (pError) {
        //console.log( pError );
        done(pError);
      }
    );
    setTimeout(function () {
      fs.emit("data", "Schwarzenegger\n");
    }, 10);
  });
});
