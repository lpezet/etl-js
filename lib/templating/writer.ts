import { JSONPath } from "jsonpath-plus";

export default class Writer {
  _rawValue(token: any[]): any {
    return token[1];
  }
  _evaluateValue(path: string, json: any): any {
    // eslint-disable-next-line new-cap
    return JSONPath({ json: json, path: path });
  }
  _renderAndDuplicate(results: any[], values: any[], index: number): any[] {
    // console.log('render: index=' + index + ', results=');
    // console.dir( results );
    if (index >= values.length) return results;

    let vals = values[index];
    // console.log('vals=');
    // console.dir( vals );
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
      // console.log('It is an array!!!!');
      const newResults = [];
      if (vals.length === 0) {
        vals.push(""); // dummy value
      }
      for (let i = 0; i < vals.length; i++) {
        for (let j = 0; j < results.length; j++) {
          const copy = results[j].slice();
          copy.push(vals[i]);
          // console.log('copy:');
          // console.dir(copy);
          newResults.push(copy);
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

      // console.log('i=' + i + ', value=');
      // console.dir(value);
      if (value !== undefined) values.push(value);
      else values.push("");
    }

    const oArrays = this._renderAndDuplicate([[]], values, 0);

    return this._reduce(oArrays);
  }
}
