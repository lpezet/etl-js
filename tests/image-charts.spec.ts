import { IETL, ModCallback } from "../lib/etl";
import Mod from "../lib/mod";
import { Callback, NoOpExecutor } from "../lib/executors";
import ImageChartsMod from "../lib/image-charts";
import { assert } from "chai";
import Context from "../lib/context";

describe("image-charts", function() {
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
  }

  /**
   * @return Context
   */
  function emptyContext(): Context {
    return { env: {}, vars: {} };
  }

  it("mod", function(done) {
    const oTested = new ImageChartsMod(new ETLMock());
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
    const oTested = new ImageChartsMod(new ETLMock());

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
      env: {},
      vars: {},
      year: "2018"
    };
    oTested.handle("root", oConfig["root"], oExecutor, oContext).then(
      function(pData: any) {
        try {
          assert.property(pData["image_charts"], "chart_2018");
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
    const oTested = new ImageChartsMod(new ETLMock());

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
    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
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
    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
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
    oTested.handle("root", oConfig["root"], oExecutor, emptyContext()).then(
      function(pData: any) {
        // console.log("##### Result: ");
        // console.dir( pData );
        if (pData) {
          // assert.isArray( pData );
          // assert.equal( 1, pData.length );
          assert.exists(pData);
          assert.exists(pData["image_charts"]);
          assert.exists(pData["image_charts"]["001_chart"]);

          const oUrl = pData["image_charts"]["001_chart"]["result"];
          // https://image-charts.com/chart?chs=700x200&cht=bvg&chxt=x,y&chxs=1N*s* inches,000000&chxl=0:|PRCP|SNOW&chdl=US1|US2&chd=a:1,1|2,2
          assert.include(oUrl, "https://image-charts.com/chart");
          assert.include(oUrl, "chs=700x200");
          assert.include(oUrl, "cht=bvg");
          assert.include(oUrl, "chxt=x,y");
          assert.include(oUrl, "chxs=1N*s* inches,000000");
          assert.include(oUrl, "chxl=0:|PRCP|SNOW");
          assert.include(oUrl, "chdl=US1|US2&chd=a:1,1|2,2");
          done();
        } else {
          done("Bad data. Something went wrong.");
        }
      },
      function(pError: Error) {
        console.log(pError);
        done(pError);
      }
    );
  });
});
