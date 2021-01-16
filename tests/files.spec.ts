import { assert } from "chai";
import FilesMod from "../lib/files";
import { loadFile } from "./utils";
import { IETL, ModCallback } from "../lib/etl";
import Mod from "../lib/mod";
import { Callback, NoOpExecutor } from "../lib/executors";
import Context from "../lib/context";

describe("files", function() {
  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
  });

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

  /**
   * @return Context
   */
  function emptyContext(): Context {
    return {
      env: {},
      vars: {},
      etl: { activityId: null, activityIndex: 0, stepName: null }
    };
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
    oTested.handle("root", oTemplate["root"], oExecutor, oContext).then(
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
      .handle("root", oConfig["root"], oExecutor, {
        env: {},
        vars: {},
        etl: { activityId: null, activityIndex: 0, stepName: null }
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

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
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

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
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

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
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

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
      function(pData: any) {
        assert.exists(pData);
        assert.exists(pData["files"]);
        assert.exists(pData["files"]["/tmp/file.txt"]);
        assert.notExists(pData["files"]["/tmp/file.txt"]["error"]);
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

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
      function(pData: any) {
        assert.exists(pData);
        assert.exists(pData["files"]);
        assert.exists(pData["files"]["/tmp/file.txt"]);
        assert.notExists(pData["files"]["/tmp/file.txt"]["error"]);
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

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
      function(pData: any) {
        assert.exists(pData);
        assert.exists(pData["files"]);
        assert.exists(pData["files"]["/tmp/file.txt"]);
        assert.notExists(pData["files"]["/tmp/file.txt"]["error"]);
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

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
      function(pData: any) {
        assert.exists(pData);
        assert.exists(pData["files"]);
        assert.exists(pData["files"]["/tmp/file.txt"]);
        assert.notExists(pData["files"]["/tmp/file.txt"]["error"]);
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

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
      function(pData: any) {
        assert.exists(pData);
        assert.exists(pData["files"]);
        assert.exists(pData["files"]["/tmp/file.txt"]);
        assert.notExists(pData["files"]["/tmp/file.txt"]["error"]);
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

    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
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

    oTested.handle("root", oConfig["root"], oExecutor, oContext).then(
      function(pData: any) {
        try {
          assert.exists(pData);
          assert.exists(pData["files"]);
          assert.exists(pData["files"]["/tmp/file.txt"]);
          assert.notExists(pData["files"]["/tmp/file.txt"]["error"]);
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

    oTested.handle("root", oConfig["root"], oExecutor, oContext).then(
      function(pData: any) {
        assert.exists(pData);
        assert.exists(pData["files"]);
        assert.exists(pData["files"]["/tmp/toto.txt"]);
        assert.notExists(pData["files"]["/tmp/toto.txt"]["error"]);
        assert.exists(pData["files"]["/tmp/titi.txt"]);
        assert.notExists(pData["files"]["/tmp/titi.txt"]["error"]);
        assert.exists(pData["files"]["/tmp/static.txt"]);
        assert.notExists(pData["files"]["/tmp/static.txt"]["error"]);
        done();
      },
      function(pError: Error) {
        // console.log( pError );
        done(pError);
      }
    );
  });
});
