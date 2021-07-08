import { assert } from "chai";
import { loadFile } from "../utils";
import HPCCDespraysMod, {
  HPCCDespraysState
} from "../../lib/mods/hpcc-desprays";
import { AbstractETL, ETLResult, ETLStatus } from "../../lib/etl";
import Context, { emptyContext } from "../../lib/context";
import Mod, { ModResult } from "../../lib/mod";
import { Callback, Executor, NoOpExecutor } from "../../lib/executors";

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

describe("hpcc-desprays", function() {
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

  it("mod", function(done) {
    const oTested = new HPCCDespraysMod();
    oTested.register(new ETLMock());
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
      year: "2018",
      ...emptyContext()
    };
    const oExecutor = new ExecutorClass();
    const oTested = new HPCCDespraysMod();
    oTested.register(new ETLMock());

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: oContext
      })
      .then(
        function(pData: ModResult<HPCCDespraysState>) {
          try {
            assert.isArray(pData.state?.desprays);
            assert.equal(pData.state?.desprays.length, 1);
            const results = pData.state?.desprays[0].results;
            assert.include(
              results.result,
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
        throw new Error("Error generated for testing purposes.");
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
    const oTested = new HPCCDespraysMod();
    oTested.register(new ETLMock());

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
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
        pCallback(
          new Error("Error generated for testing purposes."),
          "",
          "some stderr stuff"
        );
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
    const oTested = new HPCCDespraysMod();
    oTested.register(new ETLMock());

    oTested
      .handle({
        parent: "root",
        config: oTemplate["root"],
        executor: oExecutor,
        context: emptyContext()
      })
      .then(
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
    const oTested = new HPCCDespraysMod();
    oTested.register(new ETLMock());

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
    const oTested = new HPCCDespraysMod(oSettings);
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        something: {
          destinationXML: "my.xml"
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

  it("missingRequired", function(done) {
    const oExecutor = new NoOpExecutor();
    const oTested = new HPCCDespraysMod({
      "*": { server: "1.2.3.4" }
    });
    oTested.register(new ETLMock());

    const oTemplate = {
      root: {
        "noaa::ghcn::daily::2018::raw": {
          useless: true
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
    const oTested = new HPCCDespraysMod({
      "*": { server: "1.2.3.4", username: "foo", password: "bar" }
    });
    oTested.register(new ETLMock());

    const oTemplate = loadFile("./hpcc-desprays/basic.yml");

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
        function(pError) {
          // console.log( pError );
          done(pError);
        }
      );
  });
});
