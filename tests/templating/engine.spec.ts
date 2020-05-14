import { assert } from "chai";
import Engine from "../../lib/templating/engine";

describe("engine", function() {
  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
  });

  it("evaluateObjectNoVars", function() {
    const oObj = {
      abc: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        toto_titi: {
          a: "1",
          b: 2
        }
      }
    };
    const oTested = new Engine();
    const oContext = {
      year: 2018
    };
    const oActual = {};
    oTested.evaluateObject(oObj, oContext, oActual);
    // eslint-disable-next-line @typescript-eslint/camelcase
    assert.deepEqual(oActual, { abc: { toto_titi: { a: "1", b: 2 } } });
  });

  it("evaluateObjectBasic", function() {
    const oObj = {
      abc: {
        "toto_{{ year }}": {
          a: "1",
          b: 2
        }
      }
    };
    const oTested = new Engine();
    const oContext = {
      year: 2018
    };
    const oActual = {};
    oTested.evaluateObject(oObj, oContext, oActual);
    // eslint-disable-next-line @typescript-eslint/camelcase
    assert.deepEqual(oActual, { abc: { toto_2018: { a: "1", b: 2 } } });
  });

  it("evaluateObjectAdvanced", function() {
    const oObj = {
      abc: {
        "toto_{{ years }}": {
          a: "1",
          something: "{{ years }}",
          other: "{{ single }}"
        },
        "titi_{{ years }}": {
          "tutu_{{ years }}": {
            a: "{{ years }}"
          }
        }
      }
    };

    const oExpected = {
      abc: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        toto_2018: {
          a: "1",
          something: "2018",
          other: "hello world!"
        },
        // eslint-disable-next-line @typescript-eslint/camelcase
        toto_2019: {
          a: "1",
          something: "2019",
          other: "hello world!"
        },
        // eslint-disable-next-line @typescript-eslint/camelcase
        toto_2020: {
          a: "1",
          something: "2020",
          other: "hello world!"
        },
        // eslint-disable-next-line @typescript-eslint/camelcase
        titi_2018: {
          // eslint-disable-next-line @typescript-eslint/camelcase
          tutu_2018: {
            a: "2018"
          },
          // eslint-disable-next-line @typescript-eslint/camelcase
          tutu_2019: {
            a: "2019"
          },
          // eslint-disable-next-line @typescript-eslint/camelcase
          tutu_2020: {
            a: "2020"
          }
        },
        // eslint-disable-next-line @typescript-eslint/camelcase
        titi_2019: {
          // eslint-disable-next-line @typescript-eslint/camelcase
          tutu_2018: {
            a: "2018"
          },
          // eslint-disable-next-line @typescript-eslint/camelcase
          tutu_2019: {
            a: "2019"
          },
          // eslint-disable-next-line @typescript-eslint/camelcase
          tutu_2020: {
            a: "2020"
          }
        },
        // eslint-disable-next-line @typescript-eslint/camelcase
        titi_2020: {
          // eslint-disable-next-line @typescript-eslint/camelcase
          tutu_2018: {
            a: "2018"
          },
          // eslint-disable-next-line @typescript-eslint/camelcase
          tutu_2019: {
            a: "2019"
          },
          // eslint-disable-next-line @typescript-eslint/camelcase
          tutu_2020: {
            a: "2020"
          }
        }
      }
    };

    const oTested = new Engine();
    const oContext = {
      years: [2018, 2019, 2020],
      single: "hello world!"
    };
    const oActual = {};
    oTested.evaluateObject(oObj, oContext, oActual);
    assert.deepEqual(oActual, oExpected);
  });

  // Here the problem is tata_{{ single }} breaks the loop for tutu_{{ years }}, so "a": "{{ years }}" is only reduced to "a": "2018".
  it("evaluateObjectAdvancedBreakLoop", function() {
    const oObj = {
      abc: {
        "tutu_{{ years }}": {
          "tata_{{ single }}": {
            a: "{{ years }}"
          }
        }
      }
    };

    const oExpected = {
      abc: {
        // eslint-disable-next-line @typescript-eslint/camelcase
        tutu_2018: {
          // eslint-disable-next-line @typescript-eslint/camelcase
          tata_hello: {
            a: "2018"
          }
        },
        // eslint-disable-next-line @typescript-eslint/camelcase
        tutu_2019: {
          // eslint-disable-next-line @typescript-eslint/camelcase
          tata_hello: {
            a: "2018"
          }
        },
        // eslint-disable-next-line @typescript-eslint/camelcase
        tutu_2020: {
          // eslint-disable-next-line @typescript-eslint/camelcase
          tata_hello: {
            a: "2018"
          }
        }
      }
    };

    const oTested = new Engine();
    const oContext = {
      years: [2018, 2019, 2020],
      single: "hello"
    };
    const oActual = {};
    oTested.evaluateObject(oObj, oContext, oActual);
    assert.deepEqual(oActual, oExpected);
  });

  it("basic", function() {
    const oTested = new Engine();
    const oActual = oTested.evaluate("hello {{ name }}!", { name: "world" });
    console.dir(oActual);
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(["hello world!"], oActual);
  });

  it("basicWithCallback", function(done) {
    const oTested = new Engine();
    oTested.evaluate(
      "hello {{ name }}!",
      { name: "world" },
      (err: Error | null, results: string[]) => {
        if (err) {
          done(err);
        } else {
          try {
            assert.isNotNull(results);
            assert.isArray(results);
            assert.deepEqual(["hello world!"], results);
            done();
          } catch (e) {
            done(e);
          }
        }
      }
    );
  });

  it("mixedVars", function() {
    const oTested = new Engine();
    const oActual = oTested.evaluate("something::{{ today }}::{{ files }}", {
      today: "20200101",
      files: ["file1", "file2"]
    });
    console.dir(oActual);
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(
      ["something::20200101::file1", "something::20200101::file2"],
      oActual
    );
  });

  // Here the problem is tata_{{ single }} breaks the loop for tutu_{{ years }}, so "a": "{{ years }}" is only reduced to "a": "2018".
  it("evaluateObjectAdvanced2", function() {
    const oObj = {
      "tutu_{{ years }}": {
        a: "static",
        b: "{{ years }}",
        c: "{{single}}"
      }
    };

    const oExpected = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      tutu_2018: {
        a: "static",
        b: "2018",
        c: "hello"
      },
      // eslint-disable-next-line @typescript-eslint/camelcase
      tutu_2019: {
        a: "static",
        b: "2019",
        c: "hello"
      },
      // eslint-disable-next-line @typescript-eslint/camelcase
      tutu_2020: {
        a: "static",
        b: "2020",
        c: "hello"
      }
    };

    const oTested = new Engine();
    const oContext = {
      years: [2018, 2019, 2020],
      single: "hello"
    };
    const oActual = {};
    oTested.evaluateObject(oObj, oContext, oActual);
    assert.deepEqual(oActual, oExpected);
  });
});
