import { AbstractETL, ETLResult, ETLStatus } from "../../lib/etl";
import Mod, { ModResult } from "../../lib/mod";
import { Callback, Executor, NoOpExecutor } from "../../lib/executors";
import ImageChartsMod, { ImageChartsState } from "../../lib/mods/image-charts";
import { assert } from "chai";
import Context, { emptyContext } from "../../lib/context";

describe("image-charts", function() {
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
      return Promise.resolve({ status: ETLStatus.DONE, activities: [] });
    }
  }

  it("register", function(done) {
    const oTested = new ImageChartsMod();
    oTested.register(new ETLMock());
    assert.deepEqual(oTested.mSettings, { test: true });
    done();
  });

  it("tags", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        assert.include(pCmd, "snow_2018.csv");
        pCallback(null, "PRCP|SNOW\nUS1|US2\n1,1|2,2", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new ImageChartsMod();

    const oConfig = {
      root: {
        "chart_{{ year }}": {
          data: "snow_{{ year }}.csv",
          chs: "700x200",
          cht: "bvg",
          chxt: "x,y",
          chtt: "Title {{ year }}",
          chxs: "1N*s* inches,000000"
        }
      }
    };
    const oContext: Context = {
      year: "2018",
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
        function(pData: ModResult<ImageChartsState>) {
          try {
            assert.equal(pData.state?.charts.length, 1);
            assert.equal(pData.state?.charts[0].key, "chart_2018");
            done();
          } catch (e) {
            done(e);
          }
        },
        function(pError: Error) {
          done(pError);
        }
      );
  });

  it("invalidData", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, "PRCP|SNOW", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new ImageChartsMod();

    const oConfig = {
      root: {
        "001_chart": {
          data: "test.csv",
          chs: "700x200",
          cht: "bvg",
          chxt: "x,y",
          chtt: null,
          chxs: "1N*s* inches,000000"
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
        function() {
          done("Excepting error.");
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
    const oExecutor = new ExecutorClass();
    const oTested = new ImageChartsMod();

    const oConfig = {
      root: {
        "001_chart": {
          data: "test.csv",
          chs: "700x200",
          cht: "bvg",
          chxt: "x,y",
          chxs: "1N*s* inches,000000"
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
        function() {
          done("Excepting error.");
        },
        function() {
          done();
        }
      );
  });

  it("basic", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(_pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
        pCallback(null, "PRCP|SNOW\nUS1|US2\n1,1|2,2", "");
      }
    }
    const oExecutor = new ExecutorClass();
    const oTested = new ImageChartsMod(new ETLMock());

    const oConfig = {
      root: {
        "001_chart": {
          data: "test.csv",
          chs: "700x200",
          cht: "bvg",
          chxt: "x,y",
          chxs: "1N*s* inches,000000"
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
        function(pData: ModResult<ImageChartsState>) {
          // console.log("##### Result: ");
          // console.dir( pData );
          assert.equal(pData.state?.charts.length, 1);
          assert.equal(pData.state?.charts[0].key, "001_chart");
          const oUrl = pData.state?.charts[0].results.result;
          assert.include(oUrl, "https://image-charts.com/chart");
          assert.include(oUrl, "chs=700x200");
          assert.include(oUrl, "cht=bvg");
          assert.include(oUrl, "chxt=x,y");
          assert.include(oUrl, "chxs=1N*s* inches,000000");
          assert.include(oUrl, "chxl=0:|PRCP|SNOW");
          assert.include(oUrl, "chdl=US1|US2&chd=a:1,1|2,2");
          done();
        },
        function(pError: Error) {
          console.log(pError);
          done(pError);
        }
      );
  });
});
