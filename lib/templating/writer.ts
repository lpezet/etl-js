import { JSONPath } from "jsonpath-plus";
import * as jmespath from "jmespath";

const DEBUG = false;

export interface IWriter {
  renderTokens(pTokens: any[][], pContext?: any): string[];
}

export default abstract class Writer implements IWriter {
  _rawValue(token: any[]): any {
    return token[1];
  }
  abstract _evaluateValue(path: string, json: any): any;

  _renderAndDuplicate(results: any[], values: any[], index: number): any[] {
    if (DEBUG) {
      console.log("render: index=" + index + ", results=");
      console.dir(results);
    }
    if (index >= values.length) return results;

    let vals = values[index];
    if (DEBUG) {
      console.log("vals=");
      console.dir(vals);
    }
    if (!Array.isArray(vals)) {
      // results.push( vals ); // ????
      for (let i = 0; i < results.length; i++) {
        const val = results[i];
        val.push(vals);
      }
      // console.log('pushed single value:' + results);
      return this._renderAndDuplicate(results, values, index + 1);
    } else {
      if (vals.length === 1 && Array.isArray(vals[0])) vals = vals[0]; // Case when element value is an array itself.
      if (DEBUG) console.log("It is an array!!!!");
      const newResults = [];
      if (vals.length === 0) {
        vals.push(""); // dummy value
      }
      if (vals.length === results.length) {
        // Luke: Here instead of creating all possible combo, we assume (yes, might break) same vals length and simply add to each result array (push)
        // See jsonPathAdvanced/jmesPathAdvanced tests for an example
        for (let i = 0; i < results.length; i++) {
          const copy = results[i].slice();
          copy.push(vals[i]);
          if (DEBUG) {
            console.log("copy (1):");
            console.dir(copy);
          }
          newResults.push(copy);
        }
      } else {
        for (let i = 0; i < vals.length; i++) {
          for (let j = 0; j < results.length; j++) {
            const copy = results[j].slice();
            copy.push(vals[i]);
            if (DEBUG) {
              console.log("copy (0):");
              console.dir(copy);
            }
            newResults.push(copy);
          }
        }
      }
      results = newResults;
    }
    return this._renderAndDuplicate(results, values, index + 1);
  }
  _reduce(pArrays: any[][]): string[] {
    const oResults = [];
    for (let i = 0; i < pArrays.length; i++) {
      oResults.push(pArrays[i].join(""));
    }
    return oResults;
  }
  renderTokens(pTokens: any[][], pContext?: any): string[] {
    const values = [];

    let token;
    let symbol;
    let value;
    for (let i = 0, numTokens = pTokens.length; i < numTokens; ++i) {
      value = undefined;
      token = pTokens[i];
      symbol = token[0];

      // console.log('i=' + i + ', symbol=' + symbol);
      if (symbol === "text") value = this._rawValue(token);
      else if (symbol === "name") {
        value = this._evaluateValue(token[1], pContext);
      }

      if (DEBUG) {
        console.log("i=" + i + ", value=");
        console.dir(value);
      }
      if (value !== undefined) values.push(value);
      else values.push("");
    }

    const oArrays = this._renderAndDuplicate([[]], values, 0);

    return this._reduce(oArrays);
  }
}

export class JSONPathWriter extends Writer {
  _evaluateValue(path: string, json: any): any {
    // eslint-disable-next-line new-cap
    return JSONPath({ json: json, path: path });
  }
}

export class JMESPathWriter extends Writer {
  _evaluateValue(path: string, json: any): any {
    return jmespath.search(json, path);
  }
}
