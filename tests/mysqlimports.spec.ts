import { assert } from "chai";
import { IETL, ModCallback } from "../lib/etl";
import Mod from "../lib/mod";
import MySQLImportsMod from "../lib/mysqlimports";
import { Callback, NoOpExecutor } from "../lib/executors";
import { load_file } from "./utils";
import Context from "../lib/context";

describe("mysqlimports", function () {
  beforeEach(function (done: Function) {
    done();
  });

  afterEach(function (done: Function) {
    done();
  });

  function emptyContext() {
    return { env: {}, vars: {} };
  }
  class ETLMock implements IETL {
    mod(_pKey: string, _pSource: Mod, pCallback: ModCallback): void {
      pCallback({ test: true });
    }
  }

  it("mod", function (done) {
    const oTested = new MySQLImportsMod(new ETLMock());
    assert.deepEqual(oTested.mSettings, { test: true });
    done();
  });

  it("tagsMultipleValues", function (done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback) {
        //assert.include( pCmd, "--fields-enclosed-by='\"'");
        assert.notInclude(pCmd, "{{ years }}");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new MySQLImportsMod(new ETLMock());
    const oTemplate = {
      root: {
        "/downloads/{{ years }}.csv": {
          db_name: "testdb",
          fields_enclosed_by: '"',
        },
      },
    };
    const oContext: Context = {
      env: {},
      vars: {},
      years: [2018, 2019, 2020],
    };
    oTested.handle("root", oTemplate["root"], oExecutor, oContext).then(
      function (pData: any) {
        //console.log('#### Data');
        //console.dir( pData );
        try {
          assert.property(pData["mysqlimports"], "/downloads/2018.csv");
          assert.property(pData["mysqlimports"], "/downloads/2019.csv");
          assert.property(pData["mysqlimports"], "/downloads/2020.csv");
          done();
        } catch (e) {
          done(e);
        }
      },
      function (pError: Error) {
        //console.log( pError );
        done(pError);
      }
    );
  });

  it("enclose", function (done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback) {
        assert.include(pCmd, "--fields-enclosed-by='\"'");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new MySQLImportsMod(new ETLMock());
    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          db_name: "testdb",
          fields_enclosed_by: '"',
        },
      },
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function () {
        done();
      },
      function (pError: Error) {
        //console.log( pError );
        done(pError);
      }
    );
  });

  it("apply_settings_parent", function (done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback) {
        assert.include(pCmd, "--bind-address=127.0.0.1");
        assert.include(pCmd, "--silent");
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oSettings = {
      root: {
        bind_address: "127.0.0.1",
        silent: true,
      },
    };
    const oTested = new MySQLImportsMod(new ETLMock(), oSettings);

    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          db_name: "testdb",
        },
      },
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function () {
        done();
      },
      function (pError: Error) {
        //console.log( pError );
        done(pError);
      }
    );
  });

  it("apply_settings_key", function (done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback) {
        assert.include(pCmd, "--bind-address=127.0.0.1");
        assert.include(pCmd, "--silent");
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oSettings = {
      "/downloads/test.csv": {
        bind_address: "127.0.0.1",
        silent: true,
      },
    };
    const oTested = new MySQLImportsMod(new ETLMock(), oSettings);

    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          db_name: "testdb",
        },
      },
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function () {
        done();
      },
      function (pError: Error) {
        //console.log( pError );
        done(pError);
      }
    );
  });

  it("apply_settings_all", function (done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback) {
        assert.include(pCmd, "--bind-address=127.0.0.1");
        assert.include(pCmd, "--silent");
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oSettings = {
      "*": {
        bind_address: "127.0.0.1",
        silent: true,
      },
    };
    const oTested = new MySQLImportsMod(new ETLMock(), oSettings);

    const oTemplate = {
      root: {
        "/downloads/test.csv": {
          db_name: "testdb",
        },
      },
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function () {
        done();
      },
      function (pError: Error) {
        //console.log( pError );
        done(pError);
      }
    );
  });

  it("erorExecutingCmd", function (done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback) {
        pCallback(new Error("error"), null, "some stderr");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new MySQLImportsMod(new ETLMock());

    const oTemplate = load_file("./mysqlimports/basic.yml");

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function () {
        done("Expected error");
      },
      function () {
        //console.log( pError );
        done();
      }
    );
  });

  it("basic", function (done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, pCmdOpts: any, pCallback: Callback) {
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

    const oTemplate = load_file("./mysqlimports/basic.yml");

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function () {
        done();
      },
      function (pError: Error) {
        //console.log( pError );
        done(pError);
      }
    );
  });
});
