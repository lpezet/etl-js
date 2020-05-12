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
    var oTokens = this.mParser.parseToTokens(pTemplate);
    var oResults = this.mWriter.renderTokens(oTokens, pContext);
    if (pCallback) {
      pCallback(null, oResults);
      return null;
    } else {
      return oResults;
    }
  }
  evaluateObject(pObj: any, pContext: any, pCallbackOrResult?: Callback | any) {
    return this.evaluateObjectExperimental(pObj, pContext, pCallbackOrResult);
  }
  evaluateObjectExperimental(
    pTemplate: string,
    pContext: string,
    pCallbackOrResult?: Callback | any
  ) {
    var that = this;
    var oResult =
      pCallbackOrResult && typeof pCallbackOrResult === "object"
        ? pCallbackOrResult
        : {};

    const traverse = function (
      pVal: any,
      pResult: any,
      pKey: string,
      pIndex: number
    ) {
      if (DEBUG) console.log("# Traversing [" + pKey + "]: val=" + pVal);
      if (pVal == null) return;
      if (typeof pVal === "object") {
        pResult[pKey] = {};
        traverseObject(pVal, pResult[pKey], pIndex);
      } else {
        if (DEBUG) console.log("# pVal not an object: " + typeof pVal);
        if (typeof pVal === "string" && pVal.indexOf("{{") >= 0) {
          if (DEBUG)
            console.log(
              "## Found tag for : " + pVal + " (index=" + pIndex + ")"
            );
          var oTagValues = that.evaluate(pVal, pContext) || [];
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
    };

    const traverseObject = function (
      pObj: any,
      pResult: any,
      pLastIndex?: number
    ) {
      Object.keys(pObj).forEach(function (e) {
        if (e.indexOf("{{") < 0) {
          if (DEBUG) console.log("# 1");
          traverse(pObj[e], pResult, e, pLastIndex || 0);
        } else {
          if (DEBUG) console.log("# 2");
          var oTagValues = that.evaluate(e, pContext) || [];
          oTagValues.forEach(function (f, j) {
            traverse(pObj[e], pResult, f, j);
          });
        }
      });
    };

    traverseObject(pTemplate, oResult);
    if (typeof pCallbackOrResult === "function") {
      pCallbackOrResult(oResult);
    } else {
      return oResult;
    }
  }
}
