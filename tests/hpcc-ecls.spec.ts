import { assert } from "chai";
import { loadFile } from "./utils";
import HPCCECLsMod from "../lib/hpcc-ecls";
import { IETL, ModCallback } from "../lib/etl";
import Context from "../lib/context";
import Mod from "../lib/mod";
import { Callback, NoOpExecutor } from "../lib/executors";
import * as fs from "fs";
import * as os from "os";

describe("hpcc-ecls", function() {
  beforeEach(function(done: Function) {
    done();
  });

  afterEach(function(done: Function) {
    done();
  });

  /**
   * @return Context
   */
  function emptyContext(): Context {
    return { env: {}, vars: {} };
  }

  class ETLMock implements IETL {
    mod(_pKey: string, _pSource: Mod, pCallback: ModCallback): void {
      pCallback({ test: true });
    }
  }

  it("mod", function(done) {
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());
    assert.deepEqual(oTested.mSettings, {
      test: true,
      eclplus: "/usr/bin/eclplus"
    });
    done();
  });

  it("applySettingsFromKey", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "server=127.0.0.2");
        assert.include(pCmd, "username=foobar");
        assert.include(pCmd, "password=foobar");
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        pCallback: Callback
      ): void {
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oSettings = {
      "000_content": {
        server: "127.0.0.2"
      }
    };
    const oTested = new HPCCECLsMod(oSettings);
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "000_content": {
          cluster: "thor",
          content: "something",
          format: "default",
          output: "test.txt",
          username: "foobar",
          password: "foobar"
        }
      }
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done();
      },
      function(pError) {
        // console.log( pError );
        done(pError);
      }
    );
  });

  it("applySettingsFromParent", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "server=127.0.0.2");
        assert.include(pCmd, "username=foobar");
        assert.include(pCmd, "password=foobar");
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        pCallback: Callback
      ): void {
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oSettings = {
      root: {
        server: "127.0.0.2"
      }
    };
    const oTested = new HPCCECLsMod(oSettings);
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "000_content": {
          cluster: "thor",
          content: "something",
          format: "default",
          output: "test.txt",
          username: "foobar",
          password: "foobar"
        }
      }
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done();
      },
      function(pError) {
        // console.log( pError );
        done(pError);
      }
    );
  });

  it("applySettingsAndConfig", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "server=127.0.0.1");
        assert.include(pCmd, "username=foobar");
        assert.include(pCmd, "password=foobar");
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        pCallback: Callback
      ): void {
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oSettings = {
      "*": {
        server: "127.0.0.2"
      }
    };
    const oTested = new HPCCECLsMod(oSettings);
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "000_content": {
          cluster: "thor",
          content: "something",
          format: "default",
          output: "test.txt",
          server: "127.0.0.1",
          username: "foobar",
          password: "foobar"
        }
      }
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done();
      },
      function(pError) {
        // console.log( pError );
        done(pError);
      }
    );
  });

  it("applySettings", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "server=127.0.0.1");
        assert.include(pCmd, "username=foobar");
        assert.include(pCmd, "password=foobar");
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        pCallback: Callback
      ): void {
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oSettings = {
      "*": {
        server: "127.0.0.1",
        username: "foobar",
        password: "foobar"
      }
    };
    const oTested = new HPCCECLsMod(oSettings);
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "000_content": {
          cluster: "thor",
          content: "something",
          format: "default",
          output: "test.txt"
        }
      }
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done();
      },
      function(pError: Error) {
        // console.log( pError );
        done(pError);
      }
    );
  });

  it("errorThrownFromWritingContent", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        _pCallback: Callback
      ): void {
        throw new Error("Error generated for testing purposes.");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        abc: {
          cluster: "thor",
          content: "OUTPUT(2018);",
          output: "/tmp/2018/test.csv"
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done("Expecting error");
      },
      function() {
        done();
      }
    );
  });

  it("errorThrownFromPrepareFileExecutor", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, _pCallback: Callback): void {
        throw new Error("Error generated for testing purposes.");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        abc: {
          cluster: "thor",
          file: "/tmp/my.ecl",
          output: "/tmp/2018/test.csv"
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done("Expecting error");
      },
      function() {
        done();
      }
    );
  });

  it("errorThrownFromExecExecutor", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, _pCallback: Callback): void {
        throw new Error("Error generated for testing purposes.");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        abc: {
          cluster: "thor",
          content: "OUTPUT('Hello world');",
          output: "/tmp/2018/test.csv"
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done("Expecting error");
      },
      function() {
        done();
      }
    );
  });

  it("tagsMultipleValue", function(done) {
    const oCmdsExecuted = [];
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.notInclude(pCmd, "{{ year }}");
        oCmdsExecuted.push(pCmd);
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        pContent: string,
        pCallback: Callback
      ): void {
        assert.notInclude(pContent, "{{ year }}");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "summary_{{ years }}": {
          cluster: "thor",
          content: "OUTPUT({{ years }});",
          output: "/tmp/{{ years }}/test.csv"
        }
      }
    };
    const oContext: Context = {
      env: {},
      vars: {},
      years: [2018, 2019, 2020]
    };
    oTested.handle("root", oTemplate["root"], oExecutor, oContext).then(
      function(pData: any) {
        try {
          assert.equal(
            Object.keys(pData["hpcc-ecls"]).length,
            oContext.years.length
          );
          assert.equal(oCmdsExecuted.length, 3);
          assert.exists(pData["hpcc-ecls"]["summary_2018"]);
          assert.exists(pData["hpcc-ecls"]["summary_2019"]);
          assert.exists(pData["hpcc-ecls"]["summary_2020"]);
          done();
        } catch (e) {
          done(e);
        }
      },
      function(pError) {
        done(pError);
      }
    );
  });

  it("tags", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.notInclude(pCmd, "{{ year }}");
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        pContent: string,
        pCallback: Callback
      ): void {
        assert.notInclude(pContent, "{{ year }}");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "summary_{{ year }}": {
          cluster: "thor",
          content: "OUTPUT({{ year }});",
          output: "/tmp/{{ year }}/test.csv"
        }
      }
    };
    const oContext: Context = {
      env: {},
      vars: {},
      year: "2018"
    };
    oTested.handle("root", oTemplate["root"], oExecutor, oContext).then(
      function(pData: any) {
        try {
          assert.property(pData["hpcc-ecls"], "summary_2018");
          done();
        } catch (e) {
          done(e);
        }
      },
      function(pError) {
        done(pError);
      }
    );
  });

  it("mustSpecifyFileOrContent", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        pCallback: Callback
      ): void {
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "000_content": {
          cluster: "thor",
          format: "default",
          output: "test.txt"
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done(
          "Expecting error message saying file or content must be provided."
        );
      },
      function() {
        done();
      }
    );
  });

  // TODO: Fix test for Windows...
  (os.type().startsWith("Windows") ? it.skip : it)("file", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (!pCmd.includes("wget")) {
          assert.include(pCmd, "cluster=thor");
          assert.notInclude(pCmd, "format=null");
          assert.notInclude(pCmd, "output=null");
        } else {
          // the TEMP_ECL_FILE
          fs.writeFileSync("/tmp/etl-js.ecl", "something", "utf8");
        }
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        pCallback: Callback
      ): void {
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oConfig = loadFile("./hpcc-ecls/file.yml");
    oTested
      .handle("root", oConfig["root"], oExecutor, emptyContext())
      .then(
        function() {
          done();
        },
        function(pError) {
          done(pError);
        }
      )
      .finally(function() {
        fs.unlinkSync("/tmp/etl-js.ecl");
      });
  });

  it("fileWithErrorDownloadingFile", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.includes("wget")) {
          pCallback(new Error("Error generated for testing purposes."), "", "");
        }
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        pCallback: Callback
      ): void {
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oConfig = loadFile("./hpcc-ecls/file.yml");

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
      function() {
        done("Should have raised and caught error.");
      },
      function() {
        done();
      }
    );
  });

  // TODO: Fix it for Windows...
  (os.type().startsWith("Windows") ? it.skip : it)(
    "fileWithErrorRunningECL",
    function(done) {
      class ExecutorClass extends NoOpExecutor {
        exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
          if (!pCmd.includes("wget")) {
            pCallback(
              new Error("Error generated for testing purposes."),
              "",
              ""
            );
          } else {
            // the TEMP_ECL_FILE
            fs.writeFileSync("/tmp/etl-js.ecl", "something", "utf8");
          }
          pCallback(null, "", "");
        }
        writeFile(
          _pFilename: string,
          _pContent: string,
          pCallback: Callback
        ): void {
          pCallback(null, "", "");
        }
      }
      const oExecutor = new ExecutorClass();
      const oTested = new HPCCECLsMod();
      oTested.register(new ETLMock());

      const oConfig = loadFile("./hpcc-ecls/file.yml");

      oTested
        .handle("root", oConfig["root"], oExecutor, emptyContext())
        .then(
          function() {
            done("Should have raised and caught error.");
          },
          function() {
            done();
          }
        )
        .finally(function() {
          fs.unlinkSync("/tmp/etl-js.ecl");
        });
    }
  );

  it("localFile", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        // console.log( 'Command=' + pCmd );
        assert.include(pCmd, "cluster=thor");

        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        pContent: string,
        pCallback: Callback
      ): void {
        assert.equal(pContent, "hello world!");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    fs.writeFileSync("test.ecl", "hello world!");
    const oTemplate = {
      root: {
        "000_local_file": {
          cluster: "thor",
          file: "file://./test.ecl"
        }
      }
    };

    oTested
      .handle("root", oTemplate["root"], oExecutor, emptyContext())
      .then(
        function() {
          // console.log('#### ecls content: ');
          // console.dir( pData );
          done();
        },
        function(pError) {
          done(pError);
        }
      )
      .finally(function() {
        fs.unlinkSync("test.ecl");
      });
  });

  it("content", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "cluster=thor");
        assert.notInclude(pCmd, "format=null");
        assert.notInclude(pCmd, "output=null");

        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        pCallback: Callback
      ): void {
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oConfig = loadFile("./hpcc-ecls/content.yml");

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
      function() {
        done();
      },
      function(pError) {
        done(pError);
      }
    );
  });

  it("contentWithErrorCreatingFile", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        pCallback: Callback
      ): void {
        pCallback(
          new Error("Error generated for testing purposes."),
          "",
          "some stderr stuff"
        );
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oConfig = loadFile("./hpcc-ecls/content.yml");

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
      function() {
        done("Should have raised and caught error.");
      },
      function() {
        done();
      }
    );
  });

  it("contentWithErrorRunningECL", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(
          new Error("Error generated for testing purposes."),
          "",
          "somestderr stuff"
        );
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        pCallback: Callback
      ): void {
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oConfig = loadFile("./hpcc-ecls/content.yml");

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
      function() {
        done("Should have raised and caught error.");
      },
      function() {
        // console.log( pError );
        done();
      }
    );
  });

  it("formatAndOutput", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "cluster=thor");
        assert.include(pCmd, "format=default");
        assert.include(pCmd, "output=test.txt");
        pCallback(null, "", "");
      }
      writeFile(
        _pFilename: string,
        _pContent: string,
        pCallback: Callback
      ): void {
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCECLsMod();
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "000_content": {
          cluster: "thor",
          content: "something",
          format: "default",
          output: "test.txt"
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done();
      },
      function(pError: Error) {
        done(pError);
      }
    );
  });
});
