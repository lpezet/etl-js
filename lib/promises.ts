import { createLogger } from "./logger";

const LOGGER = createLogger("etljs::promises");

export function seqConcatResults(funcs: (() => Promise<any>)[]): Promise<any> {
  return funcs.reduce(
    (promise: Promise<any>, func: () => Promise<any>) =>
      promise.then((result) =>
        func().then(Array.prototype.concat.bind(result))
      ),
    Promise.resolve([])
  );
}
export function seq(
  funcs: ((res: any) => Promise<any>)[],
  startingValue: any
): Promise<any> {
  return funcs.reduce(
    (promise: Promise<any>, func: (res: any) => Promise<any>) =>
      promise.then((result) => func(result)),
    Promise.resolve(startingValue)
  );
}

const generate_name = function () {
  return "xxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    var v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export type SkiConditionEval = (pValue?: any, _pChainName?: any) => boolean;
export const DEFAULT_SKIP_CONDITION = function (
  pValue?: any,
  _pChainName?: any
) {
  return pValue && pValue["skip"];
};

var control_flow_wrapper = function (
  pIndex: number,
  pFunc: (any?: any) => Promise<any>,
  pSkipConditionEval: SkiConditionEval,
  pOptions: any
) {
  return function (pValue: any) {
    try {
      var oChainName = pOptions && pOptions["name"];
      if (!oChainName) oChainName = generate_name();
      LOGGER.debug(
        "[chain::%s] Evaluating promise #%s with %j...",
        oChainName,
        pIndex,
        pValue
      );
      //var e = new Error();
      //console.dir(e);
      if (pSkipConditionEval(pValue, oChainName)) {
        LOGGER.debug("[chain::%s] ...promise #%s skipped.", oChainName, pIndex);
        return Promise.resolve(pValue);
      }
      LOGGER.debug("[chain::%s] ...executing promise #%s.", oChainName, pIndex);
      return pFunc(pValue);
    } catch (pError) {
      LOGGER.error(
        "[chain::%s] ...Unexpected error (%s).",
        oChainName,
        pIndex,
        pError
      );
      //console.log( pError );
      //throw pError;
      return Promise.reject(pValue);
    }
  };
};

export function chain(
  pFuncs: ((any?: any) => Promise<any>)[] | ((any?: any) => Promise<any>),
  pStartingValue: any,
  pSkipConditionEval?: SkiConditionEval,
  pOptions?: any
) {
  const wrapped_funcs = [];
  const oOptions = pOptions || {};
  let oSkipConditionEval = pSkipConditionEval || DEFAULT_SKIP_CONDITION;
  if (Array.isArray(pFuncs)) {
    pFuncs.forEach((f, i) => {
      wrapped_funcs.push(
        control_flow_wrapper(i, f, oSkipConditionEval, oOptions)
      );
    });
  } else {
    wrapped_funcs.push(
      control_flow_wrapper(0, pFuncs, oSkipConditionEval, oOptions)
    );
  }
  var promise =
    wrapped_funcs.length === 0
      ? Promise.resolve(oOptions["defaultResolveValue"] || {})
      : wrapped_funcs[0](pStartingValue);
  for (var i = 1; i < wrapped_funcs.length; i++) {
    promise = promise.then(wrapped_funcs[i]);
  }

  return promise;
}
