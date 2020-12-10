import { assert } from "chai";
import Mod from "../lib/mod";
import { IETL, ModCallback } from "../lib/etl";
import CommandsMod from "../lib/commands";
import { loadFile } from "./utils";
import { Callback, NoOpExecutor } from "../lib/executors";
import Context from "../lib/context";

describe("commands", function() {
  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
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

  it("register", function(done) {
    const oTested = new CommandsMod();
    oTested.register(new ETLMock());
    assert.deepEqual(oTested.mSettings, { test: true });
    done();
  });

  it("tagsUnbalanced", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, pCmd, "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oTemplate = {
      root: {
        "hello_{{years}}_suffix": {
          command: "echo {{ binary }}"
        }
      }
    };
    const oContext: Context = {
      env: {},
      vars: {},
      binary: ["0", "1"],
      years: ["2018", "2019", "2020"]
    };
    oTested
      .handle("root", oTemplate["root"], oExecutor, oContext)
      .then(() => {
        done("Expected error saying templateis unbalanced.");
      })
      .catch(() => {
        done();
      });
  });

  it("tagsAdvanced", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        try {
          assert.equal(typeof pCmd, "string");
          if (pCmd.includes('echo "continue"')) {
            assert.notInclude(pCmd, "{{ tag1 }}");
          }

          if (pCmd.includes("2019 -eq 2019")) {
            pCallback(null, "stop", ""); // making test fail
          } else {
            pCallback(null, pCmd, "");
          }
        } catch (e) {
          pCallback(e, pCmd, "");
        }
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oTemplate = {
      root: {
        "hello_{{years}}_suffix": {
          command: "echo {{ years }}",
          test: "{{years}} -eq 2019",
          // eslint-disable-next-line @typescript-eslint/camelcase
          skip_on_test_failed: true
        }
      }
    };
    const oContext: Context = {
      env: {},
      vars: {},
      years: ["2018", "2019", "2020"]
    };
    oTested.handle("root", oTemplate["root"], oExecutor, oContext).then(
      function(pData: any) {
        try {
          // console.log('Data=');
          // console.log(JSON.stringify( pData ));
          assert.exists(pData.results);
          assert.isTrue(pData.skip);
          assert.isFalse(pData.exit);
          pData.results.forEach(function(e: any) {
            const oCmd = e["command"];
            if (oCmd !== "hello_2018_suffix" && oCmd !== "hello_2019_suffix") {
              fail(
                "Unexpected command: " + oCmd + ". Should have stopped at 2019."
              );
            }
          });
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
  });

  it("tags", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, pCmdOpts: any, pCallback: Callback): void {
        try {
          assert.equal(typeof pCmd, "string");
          if (pCmd.includes('echo "continue"')) {
            assert.notInclude(pCmd, "{{ tag1 }}");
          } else {
            assert.equal(pCmdOpts["cwd"], "/something/hello");
          }
          pCallback(null, pCmd, "");
        } catch (e) {
          pCallback(e, pCmd, "");
        }
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oTemplate = {
      root: {
        hello: {
          command: "echo {{ tag1 }}",
          test: '[ "{{ tag1 }}" == "hello"]',
          cwd: "/something/{{tag1}}"
        }
      }
    };
    const oContext = {
      env: {},
      vars: {},
      tag1: "hello"
    };
    oTested.handle("root", oTemplate["root"], oExecutor, oContext).then(
      function(pData: any) {
        try {
          // console.log('Data=');
          // console.log(JSON.stringify( pData ));
          assert.exists(pData);
          assert.isFalse(pData["exit"]);
          assert.isFalse(pData["skip"]);
          assert.exists(pData["results"]);
          assert.equal(pData["results"].length, 1);
          const result = pData["results"][0];
          assert.equal(result["command"], "hello");
          assert.exists(result["results"]);
          assert.deepEqual(result["results"], {
            result: "echo hello",
            exit: false,
            pass: true,
            skip: false,
            _stdout: "echo hello",
            _stderr: ""
          });
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
  });

  it("result_as_normal", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, '[ "Toto", "Tutu" ]');
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oTemplate = {
      root: {
        "001_json": {
          command: "dontmatter",
          // eslint-disable-next-line @typescript-eslint/camelcase
          result_as_json: false,
          var: "myvar"
        }
      }
    };
    const oContext = { env: {}, vars: {} };
    oTested.handle("root", oTemplate["root"], oExecutor, oContext).then(
      function(_pData) {
        try {
          // assert.exists( pData['commands'] );
          // assert.exists( pData[ 'commands' ][ '001_json' ] );
          // assert.isNotArray( pData[ 'commands' ][ '001_json' ][ 'result' ] );
          assert.deepEqual(oContext, {
            env: {},
            vars: { myvar: '[ "Toto", "Tutu" ]' }
          });
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
  });

  it("result_as_json", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, '[ "Toto", "Tutu" ]');
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oTemplate = {
      root: {
        "001_json": {
          command: "dontmatter",
          // eslint-disable-next-line @typescript-eslint/camelcase
          result_as_json: true,
          var: "myvar"
        }
      }
    };

    const oContext = { env: {}, vars: {} };
    oTested.handle("root", oTemplate["root"], oExecutor, oContext).then(
      function(_pData) {
        try {
          // assert.exists( pData['commands'] );
          // assert.exists( pData[ 'commands' ][ '001_json' ] );
          // assert.isArray( pData[ 'commands' ][ '001_json' ][ 'result' ] );
          assert.deepEqual(oContext, {
            env: {},
            vars: { myvar: ["Toto", "Tutu"] }
          });
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
  });

  it("invalid_json_result_as_json", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        // Evil: single quotes are not valid in JSON...
        pCallback(null, "[ 'Toto', 'Tutu' ]");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oTemplate = {
      root: {
        "001_json": {
          command: "dontmatter",
          // eslint-disable-next-line @typescript-eslint/camelcase
          result_as_json: true,
          var: "myvar"
        }
      }
    };

    const oContext = { env: {}, vars: {} };
    oTested.handle("root", oTemplate["root"], oExecutor, oContext).then(
      function(_pData) {
        try {
          // assert.exists( pData['commands'] );
          // assert.exists( pData[ 'commands' ][ '001_json' ] );
          // assert.isNotArray( pData[ 'commands' ][ '001_json' ][ 'result' ] );
          // assert.equal( pData[ 'commands' ][ '001_json' ][ 'result' ], "[ 'Toto', 'Tutu' ]" );
          assert.deepEqual(oContext, {
            env: {},
            vars: { myvar: "[ 'Toto', 'Tutu' ]" }
          });
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
  });

  it("invalid_test_output", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback();
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oTemplate = {
      root: {
        "001_test": {
          command: "gunzip test.gz",
          test: "[ ! -f test.gz ]"
        }
      }
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done();
      },
      function(pError) {
        done(pError);
      }
    );
  });
  /*
  it("null_executor", function(done) {
    const oTested = new CommandsMod();
    const oTemplate = {
      root: {
        "001_test": {
          command: "gunzip test.gz"
        }
      }
    };
    let oExecutor: Executor;
    oTested
      .handle("root", oTemplate["root"], oExecutor, { env: {}, vars: {} })
      .then(
        function() {
          done();
        },
        function(pError: Error) {
          done(pError);
        }
      );
  });
  */
  it("exit_on_error", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(new Error("Error generated for testing purposes."));
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oTemplate = {
      root: {
        "001_test": {
          command: "gunzip test.gz",
          // eslint-disable-next-line @typescript-eslint/camelcase
          exit_on_error: true
        }
      }
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function(_pData) {
        // console.log('data=');
        // console.dir(data);
        done("Expecting error");
      },
      function() {
        // console.log('Error:');
        // console.dir( pError );
        done();
      }
    );
  });

  // TODO: Somehow, right now, when a command fails, it will keep going...
  it("error_executing_cmd", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(
          new Error("Error generated for testing purposes."),
          "",
          "stderr stuff"
        );
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oTemplate = {
      root: {
        "001_test": {
          command: "gunzip test.gz"
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
  it("error_executing_cmd_ignore_errors", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(
          new Error("Error generated for testing purposes."),
          "",
          "stderr stuff"
        );
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oTemplate = {
      root: {
        "001_test": {
          command: "gunzip test.gz",
          // eslint-disable-next-line @typescript-eslint/camelcase
          ignore_errors: true
        }
      }
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done();
      },
      function() {
        done("Not expecting an error! Should be ignoring the error.");
      }
    );
  });

  it("tags_real", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.equal(pCmd, "gunzip 2019.zip");
        pCallback(null, undefined, "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oTemplate = {
      root: {
        "001_test": {
          command: "gunzip {{ vars.myvar }}.zip"
        }
      }
    };

    oTested
      .handle("root", oTemplate["root"], oExecutor, {
        env: {},
        vars: { myvar: "2019" }
      })
      .then(
        function() {
          done();
        },
        function(pError) {
          done(pError);
        }
      );
  });

  it("basic", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, pCmdOpts: any, pCallback: Callback): void {
        assert.isNotNull(pCallback);
        let error = null;
        let stdout = "";
        const stderr = "";
        switch (pCmdOpts.context) {
          case "001_test":
            if (pCmd.startsWith("gunzip")) {
              assert.equal(pCmd, "gunzip test.gz");
              assert.isNotEmpty(pCmdOpts);
              assert.equal(pCmdOpts.cwd, "/var/lib/somedir");
            } else {
              assert.equal(
                pCmd,
                '([ -f test.gz ]) && echo "continue" || echo "stop"'
              );
              // assert.isEmpty( pCmdOpts );
              stdout = "continue";
            }
            break;
          case "002_test_fail":
            stdout = "stop";
            break;
          case "005_test_error":
            // TODO
            // error = { code: 1 };
            error = new Error("Error generated for testing purposes.");
            break;
        }
        pCallback(error, stdout, stderr);
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();

    const oConfig = loadFile("./commands/basic.yml");

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
      function() {
        done();
      },
      function(pError) {
        // console.log( pError );
        done(pError);
      }
    );
  });

  it("executor_throwing_exception_in_cmd", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, _pCallback: Callback): void {
        throw new Error("Error generated for testing purposes.");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();
    const oTemplate = {
      root: {
        "001_unzip": {
          command: "gunzip my.zip"
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done("Expected rejection.");
      },
      function() {
        // console.log( pError );
        done();
      }
    );
  });

  it("executor_throwing_exception_in_test", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, _pCallback: Callback): void {
        throw new Error("Error generated for testing purposes.");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();
    const oTemplate = {
      root: {
        "001_unzip": {
          command: "gunzip my.zip",
          test: "somethig"
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done();
      },
      function(pError) {
        done(pError);
      }
    );
  });

  it("error_in_cmd_after_test_passed", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.match(/something/g)) pCallback(null, "continue");
        throw new Error("Error generated for testing purposes.");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();
    const oTemplate = {
      root: {
        "001_unzip": {
          command: "gunzip my.zip",
          test: "something"
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done("Expected rejection.");
      },
      function() {
        done();
      }
    );
  });

  it("exit_on_test_failed", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.match(/something/g)) pCallback(null, "stop");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();
    const oTemplate = {
      root: {
        "001_unzip": {
          command: "gunzip my.zip",
          test: "something",
          // eslint-disable-next-line @typescript-eslint/camelcase
          exit_on_test_failed: true
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function(data: any) {
        try {
          assert.isTrue(data["exit"]);
          assert.isFalse(data["skip"]);
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

  it("exit_on_test_error", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.match(/something/g)) {
          pCallback(new Error("Error generated for testing purposes."));
        }
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();
    const oTemplate = {
      root: {
        "001_unzip": {
          command: "gunzip my.zip",
          test: "something",
          // eslint-disable-next-line @typescript-eslint/camelcase
          exit_on_test_failed: true
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function(data: any) {
        try {
          assert.isTrue(data["exit"]);
          assert.isFalse(data["skip"]);
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

  it("no_exit_on_test_failed", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.match(/something/g)) pCallback(null, "stop");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();
    const oTemplate = {
      root: {
        "001_unzip": {
          command: "gunzip my.zip",
          test: "something",
          // eslint-disable-next-line @typescript-eslint/camelcase
          exit_on_test_failed: false
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function(data: any) {
        try {
          assert.isFalse(data["exit"]);
          assert.isFalse(data["skip"]);
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

  it("no_exit_on_test_error", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.match(/something/g)) {
          pCallback(new Error("Error generated for testing purposes."));
        }
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod(new ETLMock());
    const oTemplate = {
      root: {
        "001_unzip": {
          command: "gunzip my.zip",
          test: "something",
          // eslint-disable-next-line @typescript-eslint/camelcase
          exit_on_test_failed: false
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function(data: any) {
        try {
          assert.isFalse(data["exit"]);
          assert.isFalse(data["skip"]);
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

  it("skip_on_test_failed", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.match(/something/g)) pCallback(null, "stop");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();
    const oTemplate = {
      root: {
        "001_unzip": {
          command: "gunzip my.zip",
          test: "something",
          // eslint-disable-next-line @typescript-eslint/camelcase
          skip_on_test_failed: true
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function(data: any) {
        try {
          assert.isFalse(data["exit"]);
          assert.isTrue(data["skip"]);
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

  it("skip_on_test_error", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.match(/something/g)) {
          pCallback(new Error("Error generated for testing purposes."));
        }
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();
    const oTemplate = {
      root: {
        "001_unzip": {
          command: "gunzip my.zip",
          test: "something",
          // eslint-disable-next-line @typescript-eslint/camelcase
          skip_on_test_failed: true
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function(data: any) {
        try {
          assert.isFalse(data["exit"]);
          assert.isTrue(data["skip"]);
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

  it("no_skip_on_test_failed", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.match(/something/g)) pCallback(null, "stop");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();
    const oTemplate = {
      root: {
        "001_unzip": {
          command: "gunzip my.zip",
          test: "something",
          // eslint-disable-next-line @typescript-eslint/camelcase
          skip_on_test_failed: true
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function(data: any) {
        try {
          assert.isFalse(data["exit"]);
          assert.isTrue(data["skip"]);
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

  it("no_skip_on_test_error", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.match(/something/g)) {
          pCallback(new Error("Error generated for testing purposes."));
        }
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new CommandsMod();
    const oTemplate = {
      root: {
        "001_unzip": {
          command: "gunzip my.zip",
          test: "something",
          // eslint-disable-next-line @typescript-eslint/camelcase
          skip_on_test_failed: false
        }
      }
    };
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function(data: any) {
        try {
          assert.isFalse(data["exit"]);
          assert.isFalse(data["skip"]);
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
});
