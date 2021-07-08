import { assert } from "chai";
import FilesMod, { FilesState } from "../../lib/mods/files";
import { loadFile } from "../utils";
import { AbstractETL, ETLResult, ETLStatus } from "../../lib/etl";
import { Callback, Executor, NoOpExecutor } from "../../lib/executors";
import Context, { emptyContext } from "../../lib/context";
import Mod, { ModResult } from "../../lib/mod";
/*
import { configureLogger } from "../../../lib/logger";

configureLogger({
  appenders: {
    console: { type: "console", layout: { type: "colored" } }
  },
  categories: {
    default: { appenders: ["console"], level: "all" }
  }
});
*/
describe("files", function() {
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
    mod(
      _pKey: string,
      _pSource: Mod<any>,
      pCallback?: (settings?: any) => void
    ): void {
      if (pCallback) pCallback({ test: true });
    }
    processTemplate(_pTemplate: any, _pParameters?: any): Promise<ETLResult> {
      return Promise.resolve({ status: ETLStatus.DONE, activities: {} });
    }
  }

  it("register", function(done) {
    const oTested = new FilesMod();
    oTested.register(new ETLMock());
    assert.deepEqual(oTested.mSettings, { test: true });
    done();
  });

  it("mismatchSourcesAndTargets", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: string, pCallback: Callback): void {
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "/tmp/{{tag1}}/{{tag2}}.txt": {
          source: "https://abc.def.com/{{tags}}.txt"
        }
      }
    };
    const oContext: Context = {
      tag1: "hello",
      tag2: "world",
      tags: ["a", "b"],
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
        function(_pData: any) {
          done("Expecting error.");
        },
        function(_pError: Error) {
          // console.log( pError );
          done();
        }
      );
  });

  it("downloadError", function(done) {
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
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oConfig = loadFile("./files/basic.yml");

    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: {
          env: {},
          vars: {},
          etl: { activityId: null, activityIndex: 0, stepName: null }
        }
      })
      .then(
        function(_pData: any) {
          done("Expecting error.");
        },
        function(_pError: Error) {
          done();
        }
      );
  });

  it("downloadThrowsError", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, _pCallback: Callback): void {
        throw new Error("Error generated for testing purposes.");
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oConfig = loadFile("./files/basic.yml");

    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function(_pData: any) {
          done("Expecting error.");
        },
        function(_pError: Error) {
          done();
        }
      );
  });

  it("downloadPermsError", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.includes("chmod")) {
          pCallback(new Error("Error generated for testing purposes."));
        } else {
          pCallback(null, "", "");
        }
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "/tmp/file.txt": {
          source: "https://abc.def.com/file.txt",
          mode: "600",
          owner: "toto",
          group: "titi"
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
        function(pData: any) {
          console.log("#### Error ???");
          console.log(pData);
          done("Expecting error.");
        },
        function(_pError: Error) {
          done();
        }
      );
  });

  it("contentError", function(done) {
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
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "/tmp/toto.txt": {
          content: "some content"
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
        function(_pData: any) {
          done("Expecting error.");
        },
        function(_pError: Error) {
          done();
        }
      );
  });

  it("basic", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.equal(
          pCmd,
          '[ ! -d $(dirname "/tmp/file.txt") ] && mkdir -p $(dirname "/tmp/file.txt"); wget -O "/tmp/file.txt" "https://abc.def.com/file.txt" 2>&1'
        );
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oConfig = loadFile("./files/basic.yml");

    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function(pData: ModResult<FilesState>) {
          assert.exists(pData);
          assert.exists(pData.state);
          assert.equal(pData.state?.results.length, 1);
          const actual = pData.state?.results[0];
          assert.equal(actual.key, "/tmp/file.txt");
          assert.notExists(actual.results.result.error);
          done();
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
  });

  it("source", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.equal(
          pCmd,
          '[ ! -d $(dirname "/tmp/file.txt") ] && mkdir -p $(dirname "/tmp/file.txt"); wget -O "/tmp/file.txt" "https://abc.def.com/file.txt" 2>&1'
        );
        pCallback(null, "", "");
      }
      writeFile(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        done("Not expected executor.writeFile() call.");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oConfig = {
      root: {
        "/tmp/file.txt": {
          source: "https://abc.def.com/file.txt"
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function(pData: ModResult<FilesState>) {
          assert.exists(pData);
          assert.exists(pData.state);
          assert.equal(pData.state?.results.length, 1);
          const actual = pData.state?.results[0];
          assert.equal(actual.key, "/tmp/file.txt");
          assert.notExists(actual.results.result.error);
          done();
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
  });

  it("sourceWithPerms", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.startsWith('[ ! -d $(dirname "/tmp/file.txt") ]')) {
          assert.equal(
            pCmd,
            '[ ! -d $(dirname "/tmp/file.txt") ] && mkdir -p $(dirname "/tmp/file.txt"); wget -O "/tmp/file.txt" "https://abc.def.com/file.txt" 2>&1'
          );
        } else if (pCmd.startsWith('[ -f "/tmp/file.txt" ]')) {
          assert.include(pCmd, "chmod 600");
          assert.include(pCmd, "chgrp titi");
          assert.include(pCmd, "chown toto");
        } else {
          assert.fail("Unexpected command: " + pCmd);
        }
        pCallback(null, "", "");
      }
      writeFile(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        done("Not expected executor.writeFile() call.");
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new FilesMod(new ETLMock());

    const oConfig = {
      root: {
        "/tmp/file.txt": {
          source: "https://abc.def.com/file.txt",
          mode: "600",
          owner: "toto",
          group: "titi"
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function(pData: any) {
          assert.exists(pData);
          assert.exists(pData.state);
          assert.equal(pData.state?.results.length, 1);
          const actual = pData.state?.results[0];
          assert.equal(actual.key, "/tmp/file.txt");
          assert.notExists(actual.results.result.error);
          done();
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
  });

  it("content", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        done("Not expected executor.exec() call.");
        pCallback(null, "", "");
      }
      writeFile = function(
        _pCmd: string,
        _pCmdOpts: any,
        pCallback: Callback
      ): void {
        pCallback(null, "", "");
      };
    }

    const oExecutor = new ExecutorClass();
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oConfig = {
      root: {
        "/tmp/file.txt": {
          content: "Hello world"
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function(pData: any) {
          assert.exists(pData);
          assert.exists(pData.state);
          assert.equal(pData.state?.results.length, 1);
          const actual = pData.state?.results[0];
          assert.equal(actual.key, "/tmp/file.txt");
          assert.notExists(actual.results.result.error);
          done();
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
  });

  it("contentWithPerms", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "chmod 600");
        assert.include(pCmd, "chgrp titi");
        assert.include(pCmd, "chown toto");
        pCallback(null, "", "");
      }
      writeFile(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oConfig = {
      root: {
        "/tmp/file.txt": {
          content: "Hello world",
          mode: "600",
          owner: "toto",
          group: "titi"
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        function(pData: any) {
          assert.exists(pData);
          assert.exists(pData.state);
          assert.equal(pData.state?.results.length, 1);
          const actual = pData.state?.results[0];
          assert.equal(actual.key, "/tmp/file.txt");
          assert.notExists(actual.results.result.error);
          done();
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
  });

  it("permsError", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        if (pCmd.includes("chmod")) {
          pCallback(new Error("Error generated for testing purposes."));
        } else {
          pCallback(null, "", "");
        }
      }
      writeFile(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oConfig = {
      root: {
        "/tmp/file.txt": {
          content: "Hello world",
          mode: "600",
          owner: "toto",
          group: "titi"
        }
      }
    };

    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
        () => {
          done(new Error("Expected error."));
        },
        () => {
          done();
        }
      );
  });

  it("templateSingleValue", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "https://abc.def.com/toto.txt");
        pCallback(null, "", "");
      }
      writeFile(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        done("Not expected executor.writeFile() call.");
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oConfig = {
      root: {
        "/tmp/file.txt": {
          source:
            "https://abc.def.com/{{ $.step1.commands.001_doit.result }}.txt"
        }
      }
    };

    const oContext: Context = {
      step1: {
        commands: {
          "001_doit": {
            result: "toto"
          }
        }
      },
      ...emptyContext()
    };

    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: oContext
      })
      .then(
        function(pData: any) {
          try {
            assert.exists(pData);
            assert.exists(pData.state);
            assert.equal(pData.state?.results.length, 1);
            const actual = pData.state?.results[0];
            assert.equal(actual.key, "/tmp/file.txt");
            assert.notExists(actual.results.result.error);
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

  it("templateMultipleValues", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        // console.log('Cmd= ' + pCmd );
        if (pCmd.includes("https://abc.def.com/toto.txt")) {
          assert.include(pCmd, "/tmp/toto.txt");
        } else if (pCmd.includes("https://abc.def.com/titi.txt")) {
          assert.include(pCmd, "/tmp/titi.txt");
        } else {
          assert.include(pCmd, "https://a.b.c/static.txt");
        }
        pCallback(null, "", "");
      }
      writeFile(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        done("Not expected executor.writeFile() call.");
        pCallback(null, "", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new FilesMod();
    oTested.register(new ETLMock());

    const oConfig = {
      root: {
        "/tmp/{{ $.step1.commands.001_doit.result }}.txt": {
          source:
            "https://abc.def.com/{{ $.step1.commands.001_doit.result }}.txt"
        },
        "/tmp/static.txt": {
          source: "https://a.b.c/static.txt"
        }
      }
    };

    const oContext: Context = {
      step1: {
        commands: {
          "001_doit": {
            result: ["toto", "titi"]
          }
        }
      },
      ...emptyContext()
    };

    oTested
      .handle({
        parent: "root",
        config: oConfig["root"],
        executor: oExecutor,
        context: oContext
      })
      .then(
        function(pData: ModResult<FilesState>) {
          assert.exists(pData);
          assert.exists(pData.state);
          assert.equal(pData.state?.results.length, 3);
          let actual = pData.state?.results[0];
          assert.equal(actual.key, "/tmp/toto.txt");
          assert.notExists(actual.results.result.error);
          actual = pData.state?.results[1];
          assert.equal(actual.key, "/tmp/titi.txt");
          assert.notExists(actual.results.result.error);
          actual = pData.state?.results[2];
          assert.equal(actual.key, "/tmp/static.txt");
          assert.notExists(actual.results.result.error);
          done();
        },
        function(pError: Error) {
          // console.log( pError );
          done(pError);
        }
      );
  });
});
