import { createLogger } from "./logger";

const LOGGER = createLogger("etljs::promises");

/**
 * @param funcs functions
 * @return Promise<any>
 */
export function seqConcatResults(funcs: (() => Promise<any>)[]): Promise<any> {
  return funcs.reduce(
    (promise: Promise<any>, func: () => Promise<any>) =>
      promise.then(result => func().then(Array.prototype.concat.bind(result))),
    Promise.resolve([])
  );
}
/**
 * @param funcs functions
 * @param startingValue starting value
 * @return Promise<any>
 */
export function seq(
  funcs: ((res: any) => Promise<any>)[],
  startingValue: any
): Promise<any> {
  return funcs.reduce(
    (promise: Promise<any>, func: (res: any) => Promise<any>) =>
      promise.then(result => func(result)),
    Promise.resolve(startingValue)
  );
}

const generateName = function(): string {
  return "xxxxxxxx".replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export type SkiConditionEval = (pValue?: any, _pChainName?: any) => boolean;
export const DEFAULT_SKIP_CONDITION = function(
  pValue?: any,
  _pChainName?: any
): boolean {
  return pValue && pValue["skip"];
};

const controlFlowWrapper = function(
  pIndex: number,
  pFunc: (any?: any) => Promise<any>,
  pSkipConditionEval: SkiConditionEval,
  pOptions: any
): (data: any) => Promise<any> {
  return function(pValue: any): Promise<any> {
    let oChainName = pOptions && pOptions["name"];
    if (!oChainName) oChainName = generateName();
    try {
      LOGGER.debug(
        "[chain::%s] Evaluating promise #%s with %j...",
        oChainName,
        pIndex,
        pValue
      );
      // var e = new Error();
      // console.dir(e);
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
      // console.log( pError );
      // throw pError;
      return Promise.reject(pValue);
    }
  };
};

/**
 * @param pFuncs functions
 * @param pStartingValue starting value
 * @param pSkipConditionEval skip condition evaluation
 * @param pOptions options
 * @return Promise<any>
 */
export function chain(
  pFuncs: ((any?: any) => Promise<any>)[] | ((any?: any) => Promise<any>),
  pStartingValue: any,
  pSkipConditionEval?: SkiConditionEval,
  pOptions?: any
): Promise<any> {
  const wrappedFuncs: ((data: any) => Promise<any>)[] = [];
  const oOptions = pOptions || {};
  const oSkipConditionEval = pSkipConditionEval || DEFAULT_SKIP_CONDITION;
  if (Array.isArray(pFuncs)) {
    pFuncs.forEach((f, i) => {
      wrappedFuncs.push(controlFlowWrapper(i, f, oSkipConditionEval, oOptions));
    });
  } else {
    wrappedFuncs.push(
      controlFlowWrapper(0, pFuncs, oSkipConditionEval, oOptions)
    );
  }
  let promise =
    wrappedFuncs.length === 0
      ? Promise.resolve(oOptions["defaultResolveValue"] || {})
      : wrappedFuncs[0](pStartingValue);
  for (let i = 1; i < wrappedFuncs.length; i++) {
    promise = promise.then(wrappedFuncs[i]);
  }

  return promise;
}
