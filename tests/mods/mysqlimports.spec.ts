import { assert } from "chai";
import { AbstractETL, ETLResult, ETLStatus } from "../../lib/etl";
import Mod, { ModResult } from "../../lib/mod";
import MySQLImportsMod, {
  MySQLImportsState
} from "../../lib/mods/mysqlimports";
import { Callback, Executor, NoOpExecutor } from "../../lib/executors";
import { loadFile } from "../utils";
import Context, { emptyContext } from "../../lib/context";

describe("mysqlimports", function() {
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

  it("register", function(done) {
    const oTested = new MySQLImportsMod();
    oTested.register(new ETLMock());
    assert.deepEqual(oTested.mSettings, { test: true });
    done();
  });

  it("tagsMultipleValues", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        // assert.include( pCmd, "--fields-enclosed-by='\"'");
        assert.notInclude(pCmd, "{{ years }}");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new MySQLImportsMod(new ETLMock());
    const oTemplate = {
      root: {
        "/downloads/{{ years }}.csv": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb{{ years }}",
          // eslint-disable-next-line @typescript-eslint/camelcase
          fields_enclosed_by: '"'
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
        function(pData: ModResult<MySQLImportsState>) {
          // console.log('#### Data');
          // console.dir( pData );
          try {
            assert.property(pData.state?.mysqlimports, "/downloads/2018.csv");
            assert.property(pData.state?.mysqlimports, "/downloads/2019.csv");
            assert.property(pData.state?.mysqlimports, "/downloads/2020.csv");
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

  it("enclose", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "--fields-enclosed-by='\"'");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new MySQLImportsMod(new ETLMock());
    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb",
          // eslint-disable-next-line @typescript-eslint/camelcase
          fields_enclosed_by: '"'
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

  it("apply_settings_parent", function(done) {
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
      }
    };
    const oTested = new MySQLImportsMod(oSettings);

    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb"
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

  it("apply_settings_key", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "--bind-address=127.0.0.1");
        assert.include(pCmd, "--silent");
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oSettings = {
      "/downloads/test.csv": {
        // eslint-disable-next-line @typescript-eslint/camelcase
        bind_address: "127.0.0.1",
        silent: true
      }
    };
    const oTested = new MySQLImportsMod(oSettings);

    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb"
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

  it("apply_settings_all", function(done) {
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
    const oTested = new MySQLImportsMod(oSettings);

    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          // eslint-disable-next-line @typescript-eslint/camelcase
          db_name: "testdb"
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

  it("erorExecutingCmd", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(
          new Error("Error generated for testing purposes."),
          null,
          "some stderr"
        );
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new MySQLImportsMod(new ETLMock());

    const oTemplate = loadFile("./mysqlimports/basic.yml");

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
          // console.log( pError );
          done();
        }
      );
  });

  it("basic", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, pCmdOpts: any, pCallback: Callback): void {
        switch (pCmdOpts.context) {
          case "/downloads/test.csv":
            assert.include(pCmd, "testdb");
            assert.include(pCmd, "--columns=id,field1,field2");
            assert.include(pCmd, "--compress");
            assert.include(pCmd, "--debug");
            assert.include(pCmd, "--debug-check");
            assert.include(pCmd, "--debug-info");
            assert.include(pCmd, "--default-auth=mysql_native_password");
            assert.include(pCmd, '--fields-terminated-by="\t"');
            assert.include(pCmd, "--force");
            assert.include(pCmd, "--ignore-lines");
            assert.include(pCmd, "--ignore");
            assert.include(pCmd, '--lines-terminated-by="\n"');
            assert.include(pCmd, "--no-defaults");
            assert.include(pCmd, "--port=3306");
            assert.include(pCmd, "--protocol=TCP");
            assert.include(pCmd, "--replace");
            assert.include(pCmd, "--secure-auth");
            assert.include(pCmd, "--tls-ciphersuites=suite1:suite2:suite3");
            break;
        }
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new MySQLImportsMod(new ETLMock());

    const oTemplate = loadFile("./mysqlimports/basic.yml");

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
});
