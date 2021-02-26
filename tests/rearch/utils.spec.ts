import { assert } from "chai";
import * as utils from "../../lib/rearch/utils";

describe("utils", function() {
  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
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
    assert.sameOrderedMembers(oActual, ["activity4"]);

    oActual = utils.resolveActivities(oSimpleActivities, { etlSet: "process" });
    assert.sameOrderedMembers(oActual, ["activity3"]);
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
