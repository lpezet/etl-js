import * as Promises from "./promises";
import { AbstractMod } from "./mod";
import TemplateEngine from "./templating/engine";
import { createLogger } from "./logger";
import { Executor } from "./executors";
import Context from "./context";
import { Package } from "datapackage";
import { inspect } from "util";

// import { IETL } from "./etl";
// import { ifError } from "assert";

const LOGGER = createLogger("etljs::frictionless-data");

/*
const PRINTINFO = (pkg: Package): void => {
  console.log("#############################################################################################");
  console.log("Package:");
  console.log(pkg);
  const resource = pkg.getResource("inflation-gdp");
  if (resource == null) {
    console.log("Resource not found");
  } else {
    console.log("Found resource:");
    console.log(resource);
    console.log("Source:");
    console.log(resource.source);
    const s = resource.schema;
    console.log("Schema:");
    console.log(s);
    console.log("Fields:");
    console.log(s.fields);
  }
  console.log("#############################################################################################");
};
*/

const CHAIN_EVAL = function(_pValue: any): boolean {
  return false;
};

const prepareResults = function(
  pParent: string,
  pKey: string,
  pPreviousData: any,
  pData: any
): void {
  LOGGER.debug("[%s] Datapackage [%s] results:\n%j", pParent, pKey, pData);
  // if ( ! pPreviousData.commands[pKey] ) pPreviousData.commands[pKey] = {};
  // pPreviousData.commands[pKey] = data;
  const data = {
    key: pKey,
    results: pData
    // exit: Boolean(pData["exit"]),
    // skip: Boolean(pData["skip"])
  };
  // data[ pKey ] = pData;
  // pPreviousData.exit = pPreviousData.exit || Boolean(pData["exit"]);
  // pPreviousData.skip = pPreviousData.skip || Boolean(pData["skip"]);
  pPreviousData.results.push(data);
  return pPreviousData;
};

export default class FrictionlessDataMod extends AbstractMod<any> {
  mTemplateEngine: TemplateEngine;
  constructor(pSettings?: any) {
    super("frictionless-data", pSettings || {});
    this.mTemplateEngine = new TemplateEngine();
  }
  _evaluateToIndex(
    pTemplate: string,
    pContext: Context,
    pIndex: number
  ): string {
    const v = this.mTemplateEngine.evaluate(pTemplate, pContext);
    if (v && v.length > pIndex) return v[pIndex];
    throw new Error(
      "Unbalanced template (resolved to " +
        v?.length +
        " elements but wanted #" +
        pIndex +
        ")."
    );
  }
  _evaluateObject(pTemplate: any, pContext: Context): any {
    const result: any = {};
    this.mTemplateEngine.evaluateObject(pTemplate, pContext, result); // pContext.global );
    return result;
  }
  _doFrictionless(
    pParent: string,
    pKey: string,
    pSpecs: any,
    _pExecutor: Executor,
    pContext: Context,
    pTemplateIndex: number
  ): (data: any) => Promise<any> {
    let source = pSpecs["source"];
    if (source === null || source === undefined) {
      return () => Promise.reject(new Error("Must specify property 'source'."));
    }
    if (source.indexOf("{{") >= 0) {
      source = this._evaluateToIndex(source, pContext, pTemplateIndex);
    }
    LOGGER.debug(
      "[%s] Downloading datapackage [%s] from %s...",
      pParent,
      pKey,
      source
    );
    return (pPreviousData: any): Promise<any> => {
      return Package.load(source).then((pkg: Package) => {
        if (pSpecs["var"]) {
          LOGGER.debug(
            "[%s] Saving datapackage for [%s] to var [%s].",
            pParent,
            pKey,
            pSpecs["var"]
          );
          const varName = pSpecs["var"];
          pContext.vars[varName] = pkg;
        }
        return Promise.resolve(
          prepareResults(pParent, pKey, pPreviousData, pkg)
        );
      });
    };
  }
  _frictionless(
    pParent: string,
    pKey: string,
    pSpecs: any,
    pExecutor: Executor,
    pContext: Context
  ): (data: any) => Promise<any> {
    return (pPreviousData: any): Promise<any> => {
      const oPromises: ((data: any) => Promise<any>)[] = [];
      if (!pKey.includes("{{")) {
        // normal way
        oPromises.push(
          this._doFrictionless(pParent, pKey, pSpecs, pExecutor, pContext, 0)
        );
      } else {
        const oConfig: any = {};
        oConfig[pKey] = pSpecs;
        const oConfigs = this._evaluateObject(oConfig, pContext);
        const oConfigKeys = Object.keys(oConfigs);
        LOGGER.debug(
          "[%s] Running multiple data packages for key [%s] (%s in total)...",
          pParent,
          pKey,
          oConfigKeys.length
        );

        oConfigKeys.forEach((e, i) => {
          const oSpecs = oConfigs[e];
          // console.log("#### Running command [" + e + "] with:");
          // console.dir( oSpecs );
          oPromises.push(
            this._doFrictionless(pParent, e, oSpecs, pExecutor, pContext, i)
          );
        });
      }
      return Promises.chain(oPromises, pPreviousData, CHAIN_EVAL, {
        name: "frictionlessdata_" + pKey,
        logger: LOGGER
      });
    };
  }
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ): Promise<any> {
    LOGGER.debug("[%s] Processing frictionless-data...", pParent);
    try {
      const oResult = { results: [] };
      const oPromises: ((res: any) => Promise<any>)[] = [];
      Object.keys(pConfig).forEach(i => {
        oPromises.push(
          this._frictionless(pParent, i, pConfig[i], pExecutor, pContext)
        );
      });

      // PromiseSeqConcatResults
      // Promises.seqConcatResults( oPromises ).then(function( pData ) {
      // Promises.seq( oPromises, oResults )
      return Promises.chain(oPromises, oResult, CHAIN_EVAL, {
        name: "frictionlessdata",
        logger: LOGGER
      }).then(
        function(data: any) {
          LOGGER.info("[%s] Done processing frictionless-data.", pParent);
          LOGGER.debug(
            "[%s] Results:\n%s",
            pParent,
            inspect(data, { depth: 3, colors: true })
          );
          // console.log('commands.handle(): data = %j', data);
          // console.dir( data );
          return oResult;
        },
        function(error) {
          LOGGER.error(
            "[%s] Unexpected error running frictionless-data.",
            pParent,
            error
          );
          return Promise.reject(error);
        }
      );
    } catch (e) {
      LOGGER.error("[%s] Unexpected error processing step.", pParent, e);
      return Promise.reject(e);
    }
  }
}
