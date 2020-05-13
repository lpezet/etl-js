import Parser from "./parser";
import Writer from "./writer";

const DEBUG = false;

export type Callback = (err: Error | null, result: string[]) => void;

export default class Engine {
  mParser: Parser;
  mWriter: Writer;
  constructor() {
    this.mParser = new Parser();
    this.mWriter = new Writer();
  }
  evaluate(
    pTemplate: string,
    pContext: any,
    pCallback?: Callback
  ): string[] | null {
    const oTokens = this.mParser.parseToTokens(pTemplate);
    const oResults = this.mWriter.renderTokens(oTokens, pContext);
    if (pCallback) {
      pCallback(null, oResults);
      return null;
    } else {
      return oResults;
    }
  }
  evaluateObject(
    pObj: any,
    pContext: any,
    pCallbackOrResult?: Callback | any
  ): void {
    return this.evaluateObjectExperimental(pObj, pContext, pCallbackOrResult);
  }
  _traverseObject(
    pContext: string,
    pObj: any,
    pResult: any,
    pLastIndex?: number
  ): void {
    Object.keys(pObj).forEach(e => {
      if (!e.includes("{{")) {
        if (DEBUG) console.log("# 1");
        this._traverse(pContext, pObj[e], pResult, e, pLastIndex || 0);
      } else {
        if (DEBUG) console.log("# 2");
        const oTagValues = this.evaluate(e, pContext) || [];
        oTagValues.forEach((f: string, j: number) => {
          this._traverse(pContext, pObj[e], pResult, f, j);
        });
      }
    });
  }
  _traverse(
    pContext: string,
    pVal: any,
    pResult: any,
    pKey: string,
    pIndex: number
  ): void {
    if (DEBUG) console.log("# Traversing [" + pKey + "]: val=" + pVal);
    if (pVal == null) return;
    if (typeof pVal === "object") {
      pResult[pKey] = {};
      this._traverseObject(pContext, pVal, pResult[pKey], pIndex);
    } else {
      if (DEBUG) console.log("# pVal not an object: " + typeof pVal);
      if (typeof pVal === "string" && pVal.includes("{{")) {
        if (DEBUG) {
          console.log("## Found tag for : " + pVal + " (index=" + pIndex + ")");
        }
        const oTagValues = this.evaluate(pVal, pContext) || [];
        if (oTagValues.length === 1) {
          pResult[pKey] = oTagValues[0];
        } else if (pIndex >= oTagValues.length) {
          throw new Error(
            "Incompatible tag in sub-tree. Index=" +
              pIndex +
              ", tag values=" +
              oTagValues.length
          );
        } else {
          pResult[pKey] = oTagValues[pIndex];
        }
      } else {
        if (DEBUG) console.log("## pVal not a string or not a tag.");
        pResult[pKey] = pVal;
      }
    }
  }
  evaluateObjectExperimental(
    pTemplate: string,
    pContext: string,
    pCallbackOrResult?: Callback | any
  ): void {
    const oResult =
      pCallbackOrResult && typeof pCallbackOrResult === "object"
        ? pCallbackOrResult
        : {};
    this._traverseObject(pContext, pTemplate, oResult);
    if (typeof pCallbackOrResult === "function") {
      pCallbackOrResult(oResult);
    } else {
      return oResult;
    }
  }
}
