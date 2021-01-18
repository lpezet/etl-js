import * as Promises from "./promises";
import { AbstractMod } from "./mod";
import TemplateEngine from "./templating/engine";
import { createLogger } from "./logger";
import { Executor } from "./executors";
import Context from "./context";
import { Package } from 'datapackage';

// import { IETL } from "./etl";
// import { ifError } from "assert";

const LOGGER = createLogger("etljs::hpcc-frictionless");

const PRINTINFO = (pkg:Package):void => {
  console.log("Package:");
  console.log(pkg);
  const resource = pkg.getResource('inflation-gdp');
  if ( resource == null ) {
      console.log('Resource not found');
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
}

const CHAIN_EVAL = function(pValue: any): boolean {
    // console.log('#### CHAIN EVAL:');
    // console.log(JSON.stringify( pValue ));
    if (!pValue["results"]) {
      throw new Error(
        "Expecting { exit: ..., skip: ..., results: [] } structure."
      );
    }
    const oResults = pValue["results"];
    for (let i = oResults.length - 1; i >= 0; i--) {
      if (oResults[i]["exit"] || oResults[i]["skip"]) return true;
    }
    return false;
};

export default class HPCCFrictionlessMod extends AbstractMod<any> {
    mTemplateEngine: TemplateEngine;
    constructor(pSettings?: any) {
      super("hpcc-frictionless", pSettings || {});
      this.mTemplateEngine = new TemplateEngine();
    }
    _evaluate(pTemplate: string, pContext: Context): string[] | null {
      return this.mTemplateEngine.evaluate(pTemplate, pContext);
    }
    _evaluateToIndex(
      pTemplate: string,
      pContext: Context,
      pIndex: number
    ): string {
      const v = this._evaluate(pTemplate, pContext);
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
      ): ((data: any) => Promise<any>)[] {
        const oPromises: ((data: any) => Promise<any>)[] = [];
        let source = pSpecs["source"];
        if ( source === null || source === undefined ) return [() => Promise.reject(new Error("Must specify property 'source'."))];
        if (source.indexOf("{{") >= 0) {
          source = this._evaluateToIndex(source, pContext, pTemplateIndex);
        }
        let logicalFilenamePrefix = pSpecs["logicalFilenamePrefix"];
        if ( logicalFilenamePrefix === null || logicalFilenamePrefix === undefined ) return [() => Promise.reject(new Error("Must specify property 'logicalFilenamePrefix'."))];
        if (logicalFilenamePrefix.indexOf("{{") >= 0) {
          logicalFilenamePrefix = this._evaluateToIndex(logicalFilenamePrefix, pContext, pTemplateIndex);
        }
        let targetDir = pSpecs["targetDir"];
        if ( targetDir === null || targetDir === undefined || targetDir === "") {
            targetDir = "/var/lib/HPCCSystems/mydropzone/hpcc-frictionless/";
            LOGGER.warn(
                "[%s] Using targetDir=[%s] for [%s] to download data.",
                pParent,
                targetDir,
                pKey
              );
        }
        if (targetDir.indexOf("{{") >= 0) {
          targetDir = this._evaluateToIndex(targetDir, pContext, pTemplateIndex);
        }
        let resources = pSpecs["resources"];
        if (resources === null || resources === undefined || resources === "" || resources === [""]) return [() => Promise.reject("Must specify property 'resources'.")];
        if (typeof(resources) === 'string' ) {
          resources=[resources];
        }
        resources.forEach((r:string) => {
          if (r.indexOf("{{") >= 0) {
            r = this._evaluateToIndex(r, pContext, pTemplateIndex);
          }
          oPromises.push(async (_previousData:any):Promise<any> => {
            console.log("Loading frictionless datapackage from: [%s]", source);
            const pkg = await Package.load( source );
            PRINTINFO(pkg);
          });
        })

        return oPromises;
      };
    _frictionless(
        pParent: string,
        pKey: string,
        pSpecs: any,
        pExecutor: Executor,
        pContext: Context
      ): (data: any) => Promise<any> {
        return (pPreviousData: any): Promise<any> => {
          // console.log('# commands: pPreviousData=');
          // console.log( JSON.stringify( pPreviousData ) );
          // (pPreviousData && pPreviousData.length > 0 && (pPreviousData[ pPreviousData.length - 1 ]['exit'] || pPreviousData[ pPreviousData.length - 1 ]['skip'] ) )
          if (!pExecutor) {
            return Promise.resolve(pPreviousData);
          }
          const oPromises: ((data: any) => Promise<any>)[] = [];
          if (!pKey.includes("{{")) {
            // normal way
            this._doFrictionless(pParent, pKey, pSpecs, pExecutor, pContext, 0).forEach(f => oPromises.push(f));
          } else {
            const oConfig: any = {};
            oConfig[pKey] = pSpecs;
            const oConfigs = this._evaluateObject(oConfig, pContext);
            const oConfigKeys = Object.keys(oConfigs);
            LOGGER.debug(
              "[%s] Running multiple commands for key [%s] (%s in total)...",
              pParent,
              pKey,
              oConfigKeys.length
            );
    
            oConfigKeys.forEach((e, i) => {
              const oSpecs = oConfigs[e];
              // console.log("#### Running command [" + e + "] with:");
              // console.dir( oSpecs );
              this._doFrictionless(pParent, e, oSpecs, pExecutor, pContext, i).forEach(f => oPromises.push(f));
            });
          }
          return Promises.chain(oPromises, pPreviousData, CHAIN_EVAL, {
            name: "hpcc_frictionless_" + pKey,
            logger: LOGGER
          });
          // NOT SURE HERE if we should process the results first before sending it back
    
          // if ( pPreviousData['exit'] || !pExecutor ) {
          //	return Promise.resolve( pPreviousData );
          // }
          // console.log('commands._exec: PreviousData=');
          // console.dir( pPreviousData );
          // if ( pPreviousData['etl']['exit'] ) {
          //	return Promise.resolve( pPreviousData );
          // } else {
    
          // }
        };
      }
    handle(
        pParent: string,
        pConfig: any,
        pExecutor: Executor,
        pContext: Context
      ): Promise<any> {
        LOGGER.debug("[%s] Processing HPCC Frictionless...", pParent);
        try {
          const oResult = { exit: false, skip: false, results: [] };
          const oPromises: ((res: any) => Promise<any>)[] = [];
          Object.keys(pConfig).forEach(i => {
              oPromises.push(this._frictionless(pParent, i, pConfig[i], pExecutor, pContext));
          });
      
          // PromiseSeqConcatResults
          // Promises.seqConcatResults( oPromises ).then(function( pData ) {
          // Promises.seq( oPromises, oResults )
          return Promises.chain(oPromises, oResult, CHAIN_EVAL, {
              name: "hpcc-frictionless",
              logger: LOGGER
          })
          .then(
          function(data) {
              LOGGER.info("[%s] Done processing hpcc-frictionless.", pParent);
              LOGGER.debug("[%s] Results:\n%j", pParent, data);
              // console.log('commands.handle(): data = %j', data);
              // console.dir( data );
              return oResult;
          },
          function(error) {
              LOGGER.error(
              "[%s] Unexpected error running hpcc-frictionless.",
              pParent,
              error
              );
              return Promise.reject(error);
          });
        } catch (e) {
          LOGGER.error("[%s] Unexpected error processing step.", pParent, e);
          return Promise.reject(e);
        }
      }
    }