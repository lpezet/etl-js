import { assert } from "chai";
import { ETL } from "../lib";
import Context, { emptyContext } from "../lib/context";
import { NoOpExecutor } from "../lib/executors";
import FrictionlessDataMod from "../lib/frictionless-data";

// import { createLogger } from "../lib/logger";
// const LOGGER = createLogger("etljs::etl:hpcc-frictionless:test");
/*
import { configureLogger } from "../lib";

configureLogger({
  appenders: {
    console: { type: "console", layout: { type: "colored" } }
  },
  categories: {
    default: { appenders: ["console"], level: "all" }
  }
});
*/
describe("frictionless-data", function() {
  beforeEach(function(done: Function) {
    done();
  });

  afterEach(function(done: Function) {
    done();
  });
  /*
  const printInfo = (pkg: Package): void => {
    const resource = pkg.getResource("inflation-gdp");
    if (resource == null) {
      console.log("Resource not found");
    } else {
      console.log("Found resource:");
      console.log(resource);
      console.log("Source:");
      console.log(resource.source);
      const s = resource.schema;
      console.log("Schema:");
      console.log(s);
      console.log("Fields:");
      console.log(s.fields);
    }
  };
  */
  it("basic", function(done) {
    const oExecutor = new NoOpExecutor();
    const oTested = new FrictionlessDataMod();
    const oETL = new ETL(oExecutor, {});
    oTested.register(oETL);
    const oTemplate = {
      root: {
        inflationData: {
          source: "./tests/frictionless-data/inflation/datapackage.json"
        }
      }
    };
    const oContext: Context = {
      ...emptyContext()
    };
    oTested
      .handle("root", oTemplate["root"], oExecutor, oContext)
      .then(() => {
        done();
      })
      .catch((e: Error) => {
        done(e);
      });
  });

  it("misingSource", function(done) {
    const oExecutor = new NoOpExecutor();
    const oTested = new FrictionlessDataMod();
    const oETL = new ETL(oExecutor, {});
    oTested.register(oETL);
    const oTemplate = {
      root: {
        inflationData: {
          oops: "./tests/frictionless-data/inflation/datapackage.json"
        }
      }
    };
    const oContext: Context = {
      ...emptyContext()
    };
    oTested
      .handle("root", oTemplate["root"], oExecutor, oContext)
      .then(() => {
        done(new Error("Expecting error when source missing."));
      })
      .catch(() => {
        done();
      });
  });

  it("sourceTags", function(done) {
    const oExecutor = new NoOpExecutor();
    const oTested = new FrictionlessDataMod();
    const oETL = new ETL(oExecutor, {});
    oTested.register(oETL);
    const oTemplate = {
      root: {
        inflationData: {
          source: "./tests/frictionless-data/{{folderName}}/datapackage.json"
        }
      }
    };
    const oContext: Context = {
      folderName: "inflation",
      ...emptyContext()
    };
    oTested
      .handle("root", oTemplate["root"], oExecutor, oContext)
      .then(() => {
        done();
      })
      .catch((e: Error) => {
        done(e);
      });
  });

  it("keyTags", function(done) {
    const oExecutor = new NoOpExecutor();
    const oTested = new FrictionlessDataMod();
    const oETL = new ETL(oExecutor, {});
    oTested.register(oETL);
    const oTemplate = {
      root: {
        "{{folderName}}Data": {
          source: "./tests/frictionless-data/inflation/datapackage.json"
        }
      }
    };
    const oContext: Context = {
      folderName: "inflation",
      ...emptyContext()
    };
    oTested
      .handle("root", oTemplate["root"], oExecutor, oContext)
      .then(() => {
        done();
      })
      .catch((e: Error) => {
        done(e);
      });
  });

  it("multiple", function(done) {
    const oExecutor = new NoOpExecutor();
    const oTested = new FrictionlessDataMod();
    const oETL = new ETL(oExecutor, {});
    oTested.register(oETL);
    const oTemplate = {
      root: {
        inflationData: {
          source: "./tests/frictionless-data/inflation/datapackage.json"
        },
        donationsData: {
          source: "./tests/frictionless-data/donations/datapackage.json"
        }
      }
    };
    const oContext: Context = {
      ...emptyContext()
    };
    oTested
      .handle("root", oTemplate["root"], oExecutor, oContext)
      .then(() => {
        done();
      })
      .catch((e: Error) => {
        done(e);
      });
  });

  it("var", function(done) {
    const oExecutor = new NoOpExecutor();
    const oETL = new ETL(oExecutor, {});
    const oTested = new FrictionlessDataMod();
    oTested.register(oETL);
    const oTemplate = {
      root: {
        inflationData: {
          source: "./tests/frictionless-data/inflation/datapackage.json",
          var: "myFLD"
        }
      }
    };
    const oContext: Context = {
      ...emptyContext()
    };
    oTested
      .handle("root", oTemplate["root"], oExecutor, oContext)
      .then(() => {
        try {
          assert.exists(oContext.vars["myFLD"]);
          done();
        } catch (e) {
          done(e);
        }
      })
      .catch((e: Error) => {
        done(e);
      });
  });
});
