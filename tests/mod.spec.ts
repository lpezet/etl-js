import { assert } from "chai";
import Mod, { AbstractMod } from "../lib/mod";
import { Executor } from "../lib/executors";
import Context from "../lib/context";
import { IETL, ModCallback } from "../lib";

describe("mod", function() {
  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
  });

  class MyMod extends AbstractMod<any> {
    constructor(pSettings?: any) {
      super("mymod", pSettings || {});
    }
    get settings(): any {
      return this.mSettings;
    }
    handle(
      _pParent: string,
      _pConfig: any,
      _pExecutor: Executor,
      _pContext: Context
    ): Promise<any> {
      throw new Error("Method not implemented.");
    }
  }

  class ETLMock implements IETL {
    mSettings: any;
    constructor(pSettings?: any) {
      this.mSettings = pSettings || {};
    }
    mod(_pKey: string, _pSource: Mod, pCallback: ModCallback): void {
      pCallback(this.mSettings);
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

  it("register", function() {
    const oTested = new MyMod() as Mod;
    const oETL = new ETLMock();
    oTested.register(oETL);
  });

  it("registerNullETL", function() {
    const oTested = new MyMod() as Mod;
    let oETL: IETL;
    const doIt = (): void => {
      oTested.register.call(oTested, oETL);
    };
    assert.throws(doIt, Error, "ETL must not be null to register.");
  });

  it("registerOverrideSettings", function() {
    const oTested = new MyMod({ toto: "titi" });
    const oETL = new ETLMock({ toto: "tutu" });
    oTested.register(oETL);
    assert.deepEqual(oTested.settings, { toto: "tutu" });
  });

  it("registerExtendSettings", function() {
    const oTested = new MyMod({ toto: "titi" });
    const oETL = new ETLMock({ tata: "tutu" });
    oTested.register(oETL);
    assert.deepEqual(oTested.settings, { toto: "titi", tata: "tutu" });
  });
});
