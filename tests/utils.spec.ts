import { assert } from "chai";
import * as utils from "../lib/utils";

describe("utils", function() {
  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
  });

  it("deepCloningResolveActivities", function() {
    const oETLLegacy = {
      etl: ["activity1", "activity2", "activity3"]
    };
    const oETLSet = {
      etlSets: {
        prepare: ["activity1", "activity2"],
        process: ["activity3"],
        default: ["activity4", "activity5"]
      }
    };
    let oActual = null;

    oActual = utils.resolveActivities(oETLLegacy);
    oActual.shift();
    assert.deepEqual(oETLLegacy.etl, ["activity1", "activity2", "activity3"]); // i.e. didn't shift

    oActual = utils.resolveActivities(oETLSet, { etlSet: "prepare" });
    oActual.shift();
    assert.deepEqual(oETLSet.etlSets.prepare, ["activity1", "activity2"]); // i.e. didn't shift

    oActual = utils.resolveActivities(oETLSet); // default
    oActual.shift();
    assert.deepEqual(oETLSet.etlSets.default, ["activity4", "activity5"]); // i.e. didn't shift
  });

  it("resolveActivities", function() {
    const oSimpleActivities = {
      etlSets: {
        prepare: ["activity1", "activity2"],
        process: ["activity3"],
        default: ["activity4"]
      }
    };

    let oActual = null;

    oActual = utils.resolveActivities(oSimpleActivities);
    assert.deepEqual(oActual, ["activity4"]);

    oActual = utils.resolveActivities(oSimpleActivities, { etlSet: "process" });
    assert.deepEqual(oActual, ["activity3"]);
  });

  it("resolveEtlSets", function() {
    const oSimpleNoRefETLSets = {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      default: ["activity4"]
    };

    const oSimpleRefETLSets = {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      default: [{ etlSet: "prepare" }]
    };

    const oAdvancedRefETLSets = {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      default: [{ etlSet: "prepare" }, { etlSet: "process" }, "activity4"]
    };

    const oDeepRefETLSets = {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      report: [{ etlSet: "prepare" }, "activity5"],
      default: [
        { etlSet: "prepare" },
        { etlSet: "process" },
        "activity4",
        { etlSet: "report" }
      ]
    };

    const oInfiniteLoopRefETLSets = {
      sanity: ["activity1"],
      loop: [{ etlSet: "default" }],
      default: [{ etlSet: "loop" }]
    };

    let oActual = null;

    oActual = utils.resolveEtlSets(oSimpleNoRefETLSets);
    assert.deepEqual(oActual, {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      default: ["activity4"]
    });

    oActual = utils.resolveEtlSets(oSimpleRefETLSets);
    assert.deepEqual(oActual, {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      default: ["activity1", "activity2"]
    });

    oActual = utils.resolveEtlSets(oAdvancedRefETLSets);
    assert.deepEqual(oActual, {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      default: ["activity1", "activity2", "activity3", "activity4"]
    });

    oActual = utils.resolveEtlSets(oDeepRefETLSets);
    assert.deepEqual(oActual, {
      prepare: ["activity1", "activity2"],
      process: ["activity3"],
      report: ["activity1", "activity2", "activity5"],
      default: [
        "activity1",
        "activity2",
        "activity3",
        "activity4",
        "activity1",
        "activity2",
        "activity5"
      ]
    });

    assert.throws(function() {
      utils.resolveEtlSets(oInfiniteLoopRefETLSets);
    });
  });
});
