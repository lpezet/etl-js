import { assert } from "chai";
import { AbstractETL, ETLResult, ETLStatus } from "../../lib/etl";
import Mod, { ModResult } from "../../lib/mod";
import MySQLsMod, { MySQLState } from "../../lib/mods/mysqls";
import { Callback, Executor, NoOpExecutor } from "../../lib/executors";
import { loadFile } from "../utils";
import Context, { emptyContext } from "../../lib/context";
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

describe("mysqls", function() {
  beforeEach(function(done: Function) {
    done();
  });

  afterEach(function(done: Function) {
    done();
  });

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

  it("mod", function(done) {
    const oTested = new MySQLsMod();
    oTested.register(new ETLMock());
    assert.deepEqual(oTested.mSettings, { disabled: false, test: true });
    done();
  });

  it("var", function(done) {
    const oExpectedResult = "123456789";
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, oExpectedResult, "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new MySQLsMod();
    const oContext = emptyContext();
    const oTemplate = {
      root: {
        doSomething: {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          execute: "SELECT COUNT(*) FROM test WHERE year = 2015",
          var: "testVar"
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: oContext
      })
      .then(
        function(_pData: ModResult<MySQLState>) {
          try {
            assert.deepEqual(oContext, {
              env: {},
              vars: { testVar: oExpectedResult },
              etl: { activityId: null, activityIndex: 0, stepName: null }
            });
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

  it("outputNoLongerFromKey", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.notInclude(pCmd, "dirname");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new MySQLsMod();

    const oTemplate = {
      root: {
        doSomething: {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          execute: "SELECT * FROM test WHERE year = 2015"
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function(pData: ModResult<MySQLState>) {
          try {
            assert.property(pData.state?.mysqls, "doSomething");
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

  it("outputWithTag", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "dirname");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new MySQLsMod();

    const oTemplate = {
      root: {
        "doSomething_{{ years }}": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          execute: "SELECT * FROM test WHERE year = {{ years }}",
          output: "/somewhere/results_{{ years }}.csv"
        }
      }
    };

    const oContext: Context = {
      years: [2018, 2019, 2020],
      ...emptyContext()
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: oContext
      })
      .then(
        function(pData: ModResult<MySQLState>) {
          try {
            assert.property(pData.state?.mysqls, "doSomething_2018");
            assert.property(pData.state?.mysqls, "doSomething_2019");
            assert.property(pData.state?.mysqls, "doSomething_2020");
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

  it("outputNoTag", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "dirname");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new MySQLsMod();

    const oTemplate = {
      root: {
        doSomething: {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          execute: "SELECT * FROM test WHERE year = {{ years }}",
          output: "/somewhere/results.csv"
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function(pData: ModResult<MySQLState>) {
          try {
            assert.property(pData.state?.mysqls, "doSomething");
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

  it("tagsMultipleValues", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.notInclude(pCmd, "{{ years }}");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oSettings = {
      disabled: false,
      "*": {
        // eslint-disable-next-line @typescript-eslint/camelcase
        bind_address: "127.0.0.1",
        silent: true
      }
    };
    const oTested = new MySQLsMod(oSettings);

    const oTemplate = {
      root: {
        "do_something_{{ years }}": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          execute: "SELECT * FROM test WHERE year = {{ years }}"
        }
      }
    };

    const oContext: Context = {
      years: [2018, 2019, 2020],
      ...emptyContext()
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: oContext
      })
      .then(
        function(pData: ModResult<MySQLState>) {
          try {
            assert.property(pData.state?.mysqls, "do_something_2018");
            assert.property(pData.state?.mysqls, "do_something_2019");
            assert.property(pData.state?.mysqls, "do_something_2020");
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

  it("applySettingsParent", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "--bind-address=127.0.0.1");
        assert.include(pCmd, "--silent");
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oSettings = {
      root: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        bind_address: "127.0.0.1",
        silent: true
      },
      disabled: false
    };
    const oTested = new MySQLsMod(oSettings);

    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          execute: "SELECT * FROM test"
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function() {
          done();
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
  });

  it("applySettingsKey", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "--bind-address=127.0.0.1");
        assert.include(pCmd, "--silent");
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oSettings = {
      "*": {
        // eslint-disable-next-line @typescript-eslint/camelcase
        bind_address: "127.0.0.1",
        silent: true
      }
    };
    const oTested = new MySQLsMod(oSettings);

    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          execute: "SELECT * FROM test"
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function() {
          done();
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
  });

  it("applySettingsAll", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "--bind-address=127.0.0.1");
        assert.include(pCmd, "--silent");
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oSettings = {
      "*": {
        // eslint-disable-next-line @typescript-eslint/camelcase
        bind_address: "127.0.0.1",
        silent: true
      },
      disabled: false
    };
    const oTested = new MySQLsMod(oSettings);

    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          execute: "SELECT * FROM test"
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function() {
          done();
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
  });
  /*
  it("nullExecutor", function (done) {
    var oSettings = {};
    var oTested = new MySQLsMod(oSettings);

    var oTemplate = {
      root: {
        "/downloads/test.csv": {
          db_name: "testdb",
          execute: "SELECT * FROM test",
        },
      },
    };
    oTested
      .handle("root", oTemplate["root"], new NoOpExecutor(), emptyContext())
      .then(
        function () {
          done("Expected error");
        },
        function (pError: Error) {
          done();
        }
      );
  });
  */
  it("internalRunError", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(
          new Error("Error generated for testing purposes."),
          "",
          "some stderr stuff"
        );
      }
    }
    const oExecutor = new ExecutorClass();
    const oSettings = { disabled: false };
    const oTested = new MySQLsMod(oSettings);
    oTested._run = function() {
      throw new Error("Error generated for testing purposes.");
    };
    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          execute: "SELECT * FROM test"
        }
      }
    };
    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function() {
          done("Expected error");
        },
        function() {
          done();
        }
      );
  });

  it("internalWrapRunError", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(
          new Error("Error generated for testing purposes."),
          "",
          "some stderr stuff"
        );
      }
    }

    const oExecutor = new ExecutorClass();
    const oSettings = { disabled: false };
    const oTested = new MySQLsMod(oSettings);
    oTested._wrapRun = function() {
      throw new Error("Error generated for testing purposes.");
    };
    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          execute: "SELECT * FROM test"
        }
      }
    };
    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function() {
          done("Expected error");
        },
        function() {
          done();
        }
      );
  });

  it("errorExecutingCmd", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(
          new Error("Error generated for testing purposes."),
          "",
          "some stderr stuff"
        );
      }
    }
    const oExecutor = new ExecutorClass();
    const oSettings = { disabled: false };
    const oTested = new MySQLsMod(oSettings);

    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          execute: "SELECT * FROM test"
        }
      }
    };
    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function() {
          done("Expected error");
        },
        function() {
          done();
        }
      );
  });

  it("basic", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, pCmdOpts: any, pCallback: Callback): void {
        switch (pCmdOpts.context) {
          case "/a/b/c.txt":
            assert.include(pCmd, "--execute='SELECT * FROM test'");
            assert.include(pCmd, "--auto-rehash");
            assert.include(pCmd, "--binary-as-hex");
            assert.include(pCmd, "--binary-mode");
            assert.include(pCmd, "--columns=id,field1,field2");
            assert.include(pCmd, "--comments");
            assert.include(pCmd, "--compress");
            assert.include(pCmd, "--debug");
            assert.include(pCmd, "--debug-check");
            assert.include(pCmd, "--debug-info");
            assert.include(pCmd, "--default-auth=mysql_native_password");
            assert.include(pCmd, "--delimiter=,");
            assert.include(pCmd, "--force");
            assert.include(pCmd, "--html");
            assert.include(pCmd, "--ignore-spaces");
            assert.include(pCmd, "--line-numbers");
            assert.include(pCmd, "--no-beep");
            assert.include(pCmd, "--no-defaults");
            assert.include(pCmd, "--one-database");
            assert.include(pCmd, "--port=3306");
            assert.include(pCmd, "--protocol=TCP");
            assert.include(pCmd, "--quick");
            assert.include(pCmd, "--raw");
            assert.include(pCmd, "--reconnect");
            assert.include(pCmd, "--safe-updates");
            assert.include(pCmd, "--secure-auth");
            assert.include(pCmd, "--select_limit=1000");
            break;
        }
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new MySQLsMod();

    const oConfig = loadFile("./mysqls/basic.yml");

    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function() {
          done();
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
  });

  it("basicFalse", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, pCmdOpts: any, pCallback: Callback): void {
        switch (pCmdOpts.context) {
          case "/a/b/c.txt":
            assert.include(pCmd, "--execute='SELECT * FROM test'");
            assert.notInclude(pCmd, "--auto-rehash");
            assert.notInclude(pCmd, "--binary-as-hex");
            assert.notInclude(pCmd, "--binary-mode");
            assert.include(pCmd, "--columns=id,field1,field2");
            assert.notInclude(pCmd, "--comments");
            assert.notInclude(pCmd, "--compress");
            assert.notInclude(pCmd, "--debug");
            assert.notInclude(pCmd, "--debug-check");
            assert.notInclude(pCmd, "--debug-info");
            assert.include(pCmd, "--default-auth=mysql_native_password");
            assert.include(pCmd, "--delimiter=,");
            assert.notInclude(pCmd, "--force");
            assert.notInclude(pCmd, "--html");
            assert.notInclude(pCmd, "--ignore-spaces");
            assert.notInclude(pCmd, "--line-numbers");
            assert.notInclude(pCmd, "--no-beep");
            assert.notInclude(pCmd, "--no-defaults");
            assert.notInclude(pCmd, "--one-database");
            assert.include(pCmd, "--port=3306");
            assert.include(pCmd, "--protocol=TCP");
            assert.notInclude(pCmd, "--quick");
            assert.notInclude(pCmd, "--raw");
            assert.notInclude(pCmd, "--reconnect");
            assert.notInclude(pCmd, "--safe-updates");
            assert.notInclude(pCmd, "--secure-auth");
            assert.include(pCmd, "--select_limit=1000");
            break;
        }
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new MySQLsMod();
    const oConfig = loadFile("./mysqls/basic_false.yml");
    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function() {
          done();
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
  });
});
