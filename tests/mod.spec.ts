import { assert } from "chai";
import Mod, { AbstractMod, ModParameters } from "../lib/mod";
import { NoOpExecutor } from "../lib/executors";
import { AbstractETL, ETLResult, ETLStatus, IETL } from "../lib/etl";

describe("mod", function() {
  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
  });

  class MyMod extends AbstractMod<any, any> {
    constructor(pSettings?: any) {
      super("mymod", pSettings || {});
    }
    get settings(): any {
      return this.mSettings;
    }
    handle(_pParams: ModParameters): Promise<any> {
      throw new Error("Method not implemented.");
    }
  }

  class ETLMock extends AbstractETL {
    constructor(pSettings?: any) {
      super(new NoOpExecutor(), pSettings);
    }
    processTemplate(_pTemplate: any, _pParameters?: any): Promise<ETLResult> {
      return Promise.resolve({ status: ETLStatus.DONE, activities: [] });
    }
  }

  it("register", function() {
    const oTested = new MyMod() as Mod<any>;
    const oETL = new ETLMock();
    oTested.register(oETL);
  });

  it("registerNullETL", function() {
    const oTested = new MyMod() as Mod<any>;
    let oETL: IETL;
    const doIt = (): void => {
      oTested.register.call(oTested, oETL);
    };
    assert.throws(doIt, Error, "ETL must not be null to register.");
  });

  it("registerOverrideSettings", function() {
    const oTested = new MyMod({ toto: "titi" });
    const oETL = new ETLMock({ mods: { mymod: { toto: "tutu" } } });
    oTested.register(oETL);
    assert.deepEqual(oTested.settings, { toto: "tutu" });
  });

  it("registerExtendSettings", function() {
    const oTested = new MyMod({ toto: "titi" });
    const oETL = new ETLMock({ mods: { mymod: { tata: "tutu" } } });
    oTested.register(oETL);
    assert.deepEqual(oTested.settings, { toto: "titi", tata: "tutu" });
  });
});
