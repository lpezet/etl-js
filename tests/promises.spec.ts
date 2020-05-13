import { assert } from "chai";
import * as Promises from "../lib/promises";

describe("promises", function() {
  beforeEach(function(done: () => void) {
    done();
  });

  afterEach(function(done: () => void) {
    done();
  });

  const incrementingPromise = (pData: number): Promise<number> => {
    return new Promise(function(resolve, _reject) {
      resolve(pData + 1);
    });
  };

  const fooPromiseFunc = function(): Promise<string> {
    return new Promise(function(resolve, _reject) {
      resolve("foo");
    });
  };

  it("seq", function(done) {
    const oPromises = [];
    oPromises.push(incrementingPromise);
    oPromises.push(incrementingPromise);

    Promises.seq(oPromises, 0).then(
      (data: any) => {
        assert.equal(data, 2);
        done();
      },
      (error: Error) => {
        done(error);
      }
    );
  });

  it("seqConcatResults", function(done) {
    const oPromises = [];
    oPromises.push(fooPromiseFunc);
    oPromises.push(fooPromiseFunc);

    Promises.seqConcatResults(oPromises).then(
      function(data) {
        assert.isArray(data);
        assert.equal(data.length, 2);
        assert.deepEqual(data, ["foo", "foo"]);
        done();
      },
      function(error) {
        done(error);
      }
    );
  });

  it("chainNoFunctions", function(done) {
    Promises.chain([], "Hello world!").then(
      function(_data) {
        // console.log('Done with: ' + data);
        done();
      },
      function(error) {
        done(error);
      }
    );
  });

  it("chain", function(done) {
    let oDoneWithError = false;
    const oFuncs = [];
    let oFuncsCalled = 0;
    const oFunc1 = function(_pValue: any): Promise<any> {
      // console.log('Func1: ');
      // console.dir( pValue );
      oFuncsCalled++;
      return Promise.resolve({ skip: false });
    };
    const oFunc2 = function(_pValue: any): Promise<any> {
      // console.log('Func2: ');
      // console.dir( pValue );
      oFuncsCalled++;
      return Promise.resolve({ skip: true });
    };
    const oFunc3 = function(_pValue: any): Promise<any> {
      oFuncsCalled++;
      oDoneWithError = true;
      done(new Error("Should not be reaching Func3"));
      // console.log('Func3: ');
      // console.dir( pValue );
      return Promise.reject(new Error("Should not have come here!"));
    };
    oFuncs.push(oFunc1);
    oFuncs.push(oFunc2);
    oFuncs.push(oFunc3);

    Promises.chain(oFuncs, "Hello world!").then(
      function(_data) {
        // console.log('Done with: ' + data);
        try {
          assert.equal(oFuncsCalled, 2);
          assert.isFalse(oDoneWithError);
          done();
        } catch (error) {
          done(error);
        }
      },
      function(error) {
        if (!oDoneWithError) done(error);
      }
    );
  });

  it("chainWithCustomCondition", function(done) {
    let oFunc3Reached = false;
    let oFunc2Reached = false;
    const oCustomSkipCondition = function(pValue: any): boolean {
      return pValue && pValue["skipMe"];
    };
    const oFuncs = [];
    const oFunc1 = function(_pValue: any): Promise<any> {
      // console.log('Func1: ');
      // console.dir( pValue );
      return Promise.resolve({ skip: true }); // making sure default skip condition not used
    };
    const oFunc2 = function(_pValue: any): Promise<any> {
      oFunc2Reached = true;
      // console.log('Func2: ');
      // console.dir( pValue );
      return Promise.resolve({ skipMe: true });
    };
    const oFunc3 = function(_pValue: any): Promise<any> {
      oFunc3Reached = true;
      // done(new Error('Should not be reaching Func3'));
      // console.log('Func3: ');
      // console.dir( pValue );
      return Promise.reject(new Error("Should not have come here!"));
    };
    oFuncs.push(oFunc1);
    oFuncs.push(oFunc2);
    oFuncs.push(oFunc3);

    Promises.chain(oFuncs, "Hello world!", oCustomSkipCondition).then(
      function(_data) {
        // console.log('Done with: ' + data);
        if (!oFunc2Reached) done(new Error("Func2 should have been reached."));
        else if (oFunc3Reached) {
          done(
            new Error("Func3 has been reached and should have been skipped.")
          );
        } else done();
      },
      function(error) {
        done(error);
      }
    );
  });

  it("chainWithErrorInCustomCondition", function(done) {
    const oCustomSkipCondition = function(_pValue: any): never {
      throw new Error("dummy error");
    };
    const oFuncs = [];
    const oFunc1 = function(_pValue: any): Promise<any> {
      return Promise.resolve({}); // making sure default skip condition not used
    };
    oFuncs.push(oFunc1);

    Promises.chain(oFuncs, "Hello world!", oCustomSkipCondition).then(
      function(_data) {
        done("Expected rejection");
      },
      function(_error: Error) {
        done();
      }
    );
  });
});
