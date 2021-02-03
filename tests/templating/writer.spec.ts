import { assert } from "chai";
import { JMESPathWriter, JSONPathWriter } from "../../lib/templating/writer";

describe("writer", function() {
  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
  });

  it("jmesPathBasic", function(done) {
    const oTested = new JMESPathWriter();
    const oTokens = [["text", "hello world!", 0, 12]];
    const oActual = oTested.renderTokens(oTokens);
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(["hello world!"], oActual);
    done();
  });

  it("jmesPathSimpleToken", function(done) {
    const oTested = new JMESPathWriter();
    const oTokens = [
      ["text", "hello ", 0, 6],
      ["name", "firstName", 6, 21],
      ["text", "!", 21, 22]
    ];
    const oActual = oTested.renderTokens(oTokens, {
      firstName: "Mr. Anderson"
    });
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(["hello Mr. Anderson!"], oActual);
    done();
  });

  it("jmesPathMultipleTokens", function(done) {
    const oTested = new JMESPathWriter();
    const oTokens = [
      ["text", "hello ", 0, 6],
      ["name", "firstName", 6, 21],
      ["text", " ", 21, 22],
      ["name", "lastName", 22, 36],
      ["text", "!", 36, 37]
    ];
    const oActual = oTested.renderTokens(oTokens, {
      firstName: "Mr.",
      lastName: "Anderson"
    });
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(["hello Mr. Anderson!"], oActual);
    done();
  });

  it("jmesPathAdvanced", function(done) {
    const oTested = new JMESPathWriter();
    const oTokens = [
      ["text", "hello ", 0, 6],
      ["name", "people[].firstName", 6, 30],
      ["text", " ", 30, 31],
      ["name", "people[].lastName", 31, 54],
      ["text", "!", 54, 55]
    ];
    const oActual = oTested.renderTokens(oTokens, {
      people: [
        { firstName: "Mr.", lastName: "Anderson" },
        { firstName: "Neo", lastName: "" }
      ]
    });
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(["hello Mr. Anderson!", "hello Neo !"], oActual);
    done();
  });

  it("jsonPathBasic", function(done) {
    const oTested = new JSONPathWriter();
    const oTokens = [["text", "hello world!", 0, 12]];
    const oActual = oTested.renderTokens(oTokens);
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(["hello world!"], oActual);
    done();
  });

  it("jsonPathSimpleToken", function(done) {
    const oTested = new JSONPathWriter();
    const oTokens = [
      ["text", "hello ", 0, 6],
      ["name", "firstName", 6, 21],
      ["text", "!", 21, 22]
    ];
    const oActual = oTested.renderTokens(oTokens, {
      firstName: "Mr. Anderson"
    });
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(["hello Mr. Anderson!"], oActual);
    done();
  });

  it("jsonPathMultipleTokens", function(done) {
    const oTested = new JSONPathWriter();
    const oTokens = [
      ["text", "hello ", 0, 6],
      ["name", "firstName", 6, 21],
      ["text", " ", 21, 22],
      ["name", "lastName", 22, 36],
      ["text", "!", 36, 37]
    ];
    const oActual = oTested.renderTokens(oTokens, {
      firstName: "Mr.",
      lastName: "Anderson"
    });
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(["hello Mr. Anderson!"], oActual);
    done();
  });

  it("jsonPathAdvanced", function(done) {
    const oTested = new JSONPathWriter();
    const oTokens = [
      ["text", "hello ", 0, 6],
      ["name", "people[*].firstName", 6, 30],
      ["text", " ", 30, 31],
      ["name", "people[*].lastName", 31, 54],
      ["text", "!", 54, 55]
    ];
    const oActual = oTested.renderTokens(oTokens, {
      people: [
        { firstName: "Mr.", lastName: "Anderson" },
        { firstName: "Neo", lastName: "" }
      ]
    });
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(["hello Mr. Anderson!", "hello Neo !"], oActual);
    done();
  });

  it("jsonPathArrayTokens", function(done) {
    const oTested = new JSONPathWriter();
    const oTokens = [
      ["text", "hello ", 0, 6],
      ["name", "firstName", 6, 21],
      ["text", " ", 21, 22],
      ["name", "addresses..line1", 22, 36],
      ["text", "!", 36, 37]
    ];
    const oContext = {
      firstName: "Mr. Anderson",
      addresses: [{ line1: "123 Street Drive" }, { line1: "456 Camino Street" }]
    };
    const oActual = oTested.renderTokens(oTokens, oContext);
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(
      [
        "hello Mr. Anderson 123 Street Drive!",
        "hello Mr. Anderson 456 Camino Street!"
      ],
      oActual
    );
    done();
  });

  it("jsonPathTokensArrayValue", function(done) {
    const oTested = new JSONPathWriter();
    const oTokens = [
      ["text", "hello ", 0, 6],
      ["name", "firstName", 6, 21],
      ["text", " ", 21, 22],
      ["name", "addresses", 22, 31],
      ["text", "!", 31, 32]
    ];
    const oContext = {
      firstName: "Mr. Anderson",
      addresses: ["123 Street Drive", "456 Camino Street"]
    };
    const oActual = oTested.renderTokens(oTokens, oContext);
    assert.isNotNull(oActual);
    assert.isArray(oActual);
    assert.deepEqual(
      [
        "hello Mr. Anderson 123 Street Drive!",
        "hello Mr. Anderson 456 Camino Street!"
      ],
      oActual
    );
    done();
  });
});
