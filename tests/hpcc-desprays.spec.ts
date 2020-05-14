import { assert } from "chai";
import { loadFile } from "./utils";
import HPCCDespraysMod from "../lib/hpcc-desprays";
import { IETL, ModCallback } from "../lib/etl";
import Context from "../lib/context";
import Mod from "../lib/mod";
import { Callback, NoOpExecutor } from "../lib/executors";

describe("hpcc-desprays", function() {
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

  it("mod", function(done) {
    const oTested = new HPCCDespraysMod(new ETLMock());
    assert.deepEqual(oTested.mSettings, { test: true });
    done();
  });

  it("tagsInLogicalAndDestinationPath", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, pCmd, "");
      }
    }
    const oTemplate = {
      root: {
        "noaa::ghcn::daily::{{ year }}::raw": {
          destinationIP: "192.168.0.10",
          destinationPath:
            "/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/{{ year }}.csv"
        }
      }
    };
    const oContext: Context = {
      env: {},
      vars: {},
      year: "2018"
    };
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCDespraysMod(new ETLMock());
    oTested.handle("root", oTemplate["root"], oExecutor, oContext).then(
      function(pData: any) {
        // console.dir( pData );
        try {
          assert.property(
            pData["hpcc-desprays"],
            "noaa::ghcn::daily::2018::raw"
          );
          assert.include(
            pData["hpcc-desprays"]["noaa::ghcn::daily::2018::raw"]["result"],
            "dstfile=/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/2018.csv"
          );
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

  it("executorThrowingError", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, _pCallback: Callback): void {
        throw new Error("error");
      }
    }
    const oTemplate = {
      root: {
        something: {
          destinationXML: "my.xml"
        }
      }
    };
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCDespraysMod(new ETLMock());
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done("Expecting error.");
      },
      function() {
        done();
      }
    );
  });

  it("error", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(new Error("error"), "", "some stderr stuff");
      }
    }
    const oTemplate = {
      root: {
        something: {
          destinationXML: "my.xml"
        }
      }
    };
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCDespraysMod(new ETLMock());
    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done("Expecting error.");
      },
      function() {
        done();
      }
    );
  });

  it("safe_parse_int", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "nowait=0");
        pCallback(null, "", "");
      }
    }
    const oTemplate = {
      root: {
        something: {
          destinationXML: "my.xml",
          timeout: "abcd"
        }
      }
    };
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCDespraysMod(new ETLMock());
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

  it("apply_settings", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "server=127.0.0.1");
        assert.include(pCmd, "username=foobar");
        assert.include(pCmd, "password=foobar");
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
    const oTested = new HPCCDespraysMod(new ETLMock(), oSettings);

    const oTemplate = {
      root: {
        something: {
          destinationXML: "my.xml"
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

  it("missingRequired", function(done) {
    const oExecutor = new NoOpExecutor();
    const oTested = new HPCCDespraysMod(new ETLMock(), {
      "*": { server: "1.2.3.4" }
    });

    const oTemplate = {
      root: {
        "noaa::ghcn::daily::2018::raw": {
          useless: true
        }
      }
    };

    oTested.handle("root", oTemplate["root"], oExecutor, emptyContext()).then(
      function() {
        done("Expected error due to missing format information in template.");
      },
      function() {
        done();
      }
    );
  });

  it("basic", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        // console.log('cmd=' + pCmd );
        assert.include(pCmd, "action=despray");
        assert.include(pCmd, "server=1.2.3.4");
        assert.include(
          pCmd,
          "dstfile=/var/lib/HPCCSystems/mydropzone/noaa/ghcn/daily/by_year/2018.csv"
        );
        assert.include(pCmd, "dstip=192.168.0.10");
        assert.include(pCmd, "srcname=noaa::ghcn::daily::2018::raw");
        assert.include(pCmd, "nowait=1");
        assert.include(pCmd, "server=");
        assert.include(pCmd, "connect=1");
        assert.include(pCmd, "overwrite=0");
        assert.include(pCmd, "replicate=0");
        assert.include(pCmd, "compress=0");
        assert.include(pCmd, "username=foo");
        assert.include(pCmd, "password=bar");
        pCallback(null, "", "");
      }
    }

    const oExecutor = new ExecutorClass();
    const oTested = new HPCCDespraysMod(new ETLMock(), {
      "*": { server: "1.2.3.4", username: "foo", password: "bar" }
    });

    const oTemplate = loadFile("./hpcc-desprays/basic.yml");

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
});
