import Mod from "./mod";
import { EventEmitter } from "events";
import * as Promises from "./promises";
import Context from "./context";
import { Executor } from "./executors";
import { createLogger } from "./logger";

const LOGGER = createLogger("etljs::main");

const EXIT_OR_SKIP_CONDITION = function (_pValue: string, _pChainName: string) {
  //console.log('##########EXIT_OR_SKIP_CONDITION: Chain=%s, pValue=%j', pChainName, pValue);
  //return pValue && (pValue['skip'] || pValue['exit']);
  return false;
};

function mod_settings(pSettings: any, pMod: string): any {
  if (!pSettings) return {};
  if (!pSettings["mods"]) return {};
  if (!pSettings["mods"][pMod]) return {};
  return pSettings["mods"][pMod];
}

export type ModCallback = (settings?: any) => void;

export interface IETL {
  mod(pKey: string, pSource: Mod, pCallback?: ModCallback): void;
}

class ETL extends EventEmitter {
  mMods: { [key: string]: Mod };
  mSettings: any;
  mExecutor: any;
  constructor(pExecutor: Executor, pSettings?: any) {
    super();
    this.mSettings = pSettings || {};
    this.mMods = {};
    this.mExecutor = pExecutor;
  }
  get_mods(): any {
    return this.mMods;
  }
  mod(pKey: string, pSource: Mod, pCallback?: (settings?: any) => void) {
    if (this.mMods[pKey]) throw "Mod for " + pKey + " already registered.";
    this.mMods[pKey] = pSource; //pFn.bind( pSource );
    const modSettings = mod_settings(this.mSettings, pKey);
    if (pCallback) pCallback(modSettings);
  }
  _step_process(
    pActivityId: string,
    pKey: string,
    pStep: any,
    pHandler: Mod,
    _pResults: any,
    pContext: any
  ): any {
    let that = this;
    // pCurrentActivityData: { exit: true|false, skip: true|false, steps: {} }
    return function (pCurrentActivityData: any) {
      try {
        if (
          pCurrentActivityData &&
          (pCurrentActivityData["skip"] || pCurrentActivityData["exit"])
        ) {
          LOGGER.debug("[%s] Skipping step %s.", pActivityId, pKey);
          return Promise.resolve(pCurrentActivityData);
        } else {
          //console.log('## etl: Returning handle() for ' + pActivityId);
          LOGGER.debug("[%s] Executing step %s...", pActivityId, pKey);
          return new Promise(function (resolve, reject) {
            //return
            pHandler
              .handle(pActivityId, pStep, that.mExecutor, pContext) // pCurrentActivityData, pResults, pContext )
              .then(
                (pData: any) => {
                  //console.log('######## handle!!!!');
                  //console.log( JSON.stringify( pData ) );
                  pData = pData || {};
                  pCurrentActivityData.skip =
                    pCurrentActivityData.skip || Boolean(pData["skip"]);
                  pCurrentActivityData.exit =
                    pCurrentActivityData.exit || Boolean(pData["exit"]);
                  //pCurrentActivityData.results.push( { step: pKey, results: pData } );
                  pCurrentActivityData.steps[pKey] = pData;
                  //console.log('######## handle end!!!!');
                  resolve(pCurrentActivityData);
                },
                (pError: Error) => {
                  reject(pError); ///????
                }
              );
          });
        }
      } catch (e) {
        LOGGER.error(
          "[%s] Error executing step for [%s].",
          pActivityId,
          pKey,
          e
        );
        throw e;
      }
    };
  }
  _wrap_activity_process(
    pStepIndex: number,
    pTotalSteps: number,
    pActivityId: string,
    pStep: any,
    pResults: any,
    pContext: any
  ) {
    let that = this;
    return function (pData: any) {
      LOGGER.info(
        "[%s] Executing activity (%s/%s)...",
        pActivityId,
        pStepIndex,
        pTotalSteps
      );
      LOGGER.debug("[%s] Checking to exit: [%s]", pActivityId, pData["exit"]);
      //console.log('######## _wrap_activity_process!!!! : ');
      //console.log( JSON.stringify( pData ) );
      if (pData["exit"]) {
        LOGGER.debug("[%s] Exiting (skipping)...", pActivityId);
        //TODO: log exit behavior here. Use _exit_from to log which section triggered exit.
        return Promise.resolve(pData); //TODO: resolve?
      } else {
        try {
          return that._activity_process(
            pStepIndex,
            pTotalSteps,
            pActivityId,
            pStep,
            pData,
            pResults,
            pContext
          );
        } catch (e) {
          LOGGER.error("[%s] Error executing activity.", pActivityId);
          return Promise.reject(e); //TODO: check e
        }
      }
    };
  }
  _activity_process(
    pActivityIndex: number,
    pTotalActivities: number,
    pActivityId: string,
    pActivity: any,
    _pPreviousActivityData: any,
    pResults: any,
    pContext: any
  ) {
    let that = this;
    return new Promise(function (resolve, reject) {
      let oProcesses = [];
      try {
        /*
              let oResult = {
                  exit: false,
                  skip: false,
                  steps: {}
              }
              */
        //
        //TODO: Rename pPreviousStepData into pContext
        //pPreviousStepData[ pActivityId ] = {};

        for (let i in pActivity) {
          let oMod = that.mMods[i];
          LOGGER.debug("[%s] Encountered [%s]...", pActivityId, i);
          //console.log('## etl: Activity ' + pActivityId + ' mod=' + i);
          if (!oMod) {
            LOGGER.error("[%s] ...mod [%s] unknown. Skipping.", pActivityId, i);
          } else {
            LOGGER.debug("[%s] ...adding mod [%s] to chain...", pActivityId, i);
            oProcesses.push(
              that._step_process(
                pActivityId,
                i,
                pActivity[i],
                oMod,
                pResults,
                pContext
              )
            );
          }
        }
        //Promises.seq( oProcesses, pPreviousActivityData )

        Promises.chain(
          oProcesses,
          {
            exit: false,
            skip: false,
            steps: {},
          },
          //pPreviousActivityData
          EXIT_OR_SKIP_CONDITION,
          { name: "steps" }
        ).then(
          (pData: any) => {
            //console.log('############ chained !!!!!');
            LOGGER.info(
              "[%s] Activity completed (%s/%s).",
              pActivityId,
              pActivityIndex,
              pTotalActivities
            );
            LOGGER.info("[%s] Activity results: %j", pActivityId, pData);
            //console.log(' pData=' );
            //console.log( JSON.stringify( pData ) );

            /*
                  console.log('etl._process: (2) pPreviousStepData = ');
                  console.log(util.inspect(pPreviousStepData, false, null, true))
                  console.log('etl._process: (2) pDataResults = ');
                  console.log(util.inspect(pDataResults, false, null, true))
                  console.log('etl._process: (2) pData = ');
                  console.log(util.inspect(pData, false, null, true))
                  */

            //TODO: no need then:
            let oResult = {
              activity: pActivityId,
              steps: pData["steps"],
              exit: Boolean(pData["exit"]),
              skip: Boolean(pData["skip"]),
            };
            if (pData["exit"]) pResults.exit = pData["exit"];
            pResults.activities.push(oResult);
            //pResult[ pActivityId ] = pData;
            //TODO: replace with:
            //resolve( pPreviousStepData );
            that.emit(
              "activityDone",
              pActivityId,
              null,
              pData,
              pActivityIndex,
              pTotalActivities
            );
            resolve(oResult);
          },
          (pError: Error) => {
            LOGGER.error("[%s] Errors during activity.", pActivityId, pError);
            //console.log('etl._process: (3) pDataResults = ' + pDataResults);
            //pContext[ pActivityId ] = pError; //TODO:????
            let oResult = { activity: pActivityId, error: pError };
            pResults.activities.push(oResult);

            that.emit(
              "activityDone",
              pActivityId,
              pError,
              null,
              pActivityIndex,
              pTotalActivities
            );
            reject(pError);
          }
        );
      } catch (e) {
        reject(e);
        LOGGER.error("[%s] Unexpected error during activity.", pActivityId, e);
      }
    });
  }
  _resolve_etlsets(pETLs: any) {
    let oStack = [];
    for (let i in pETLs) {
      oStack.push({ key: i, value: pETLs[i], tries: 0 });
    }
    let s: any;
    const oResolved: any = {};
    while (oStack.length > 0) {
      s = oStack.shift();
      const k = s.key;
      //console.log('## Working on: ' + k);
      const v = s.value;
      let nv: any[] = []; // new values
      let oResolveLater = false;
      for (let i in v) {
        let oVal = v[i];
        let oValType = typeof oVal;
        switch (oValType) {
          case "string":
            nv.push(oVal);
            break;
          case "object":
            let oRef = oVal["etlSet"];
            //TODO: throw error if not present
            if (!oResolved[oRef]) {
              //console.log( 'Need to resolve later: ' + k);
              if (s.tries > 5) {
                throw new Error(
                  "Infinite loop detected with (at least) entry [" + k + "]."
                );
              }
              s.tries++;
              oStack.push(s); // resolve it later
              oResolveLater = true;
            } else {
              nv = nv.concat(oResolved[oRef]);
            }
            break;
          default:
            throw new Error(k + ": value type " + oValType + " not supported.");
        }
        if (oResolveLater) break;
      }
      if (!oResolveLater) {
        //console.log('### Resolved ' + k);
        oResolved[k] = nv;
      }
    }
    return oResolved;
  }
  _resolve_activities(pConfig: any, pParameters: any) {
    if (pConfig["etl"]) return pConfig["etl"];
    if (!pConfig["etlSets"])
      throw new Error(
        'Either etl or etlSets (+ "etlSet" param) must be provided in template.'
      );
    let oResolvedETLs = this._resolve_etlsets(pConfig["etlSets"]);
    return oResolvedETLs[pParameters["etlSet"]];
  }
  process(pConfig: any, pParameters?: any) {
    let that = this;
    return new Promise(function (resolve, reject) {
      LOGGER.info("Starting ETL...");
      try {
        let oResult = {
          exit: false,
          activities: [],
        };
        let oETLActivities = that._resolve_activities(pConfig, pParameters);
        if (!oETLActivities) {
          LOGGER.warn("Nothing to run.");
          resolve(oResult);
          return;
        }
        const oTotalActivities = oETLActivities.length;
        let oActivityProcesses = [];
        let oContext: Context = { env: {}, vars: {} };
        for (let i in process.env) {
          oContext.env[i] = process.env[i] || "";
        }
        for (let i = 0; i < oETLActivities.length; i++) {
          let oActivityId = oETLActivities[i];
          let oActivity = pConfig[oActivityId];
          //console.log('### etl: activity=' + oETLActivities[i]);
          if (!oActivity) {
            //TODO
            LOGGER.warn(
              "No configuration for activity [%s] (%s/%s). Skipping.",
              oActivityId,
              i + 1,
              oTotalActivities
            );
          } else {
            LOGGER.debug("Encountered activity [%s]...", oActivityId);
            //console.log('## etl: Activity found: ' + oActivityId);
            oActivityProcesses.push(
              that._wrap_activity_process(
                i + 1,
                oTotalActivities,
                oActivityId,
                oActivity,
                oResult,
                oContext
              )
            );
          }
        }
        //Promises.seq( oStepProcesses, {} )
        //console.log('####### oStepProcesses = ' + oActivityProcesses.length);
        Promises.chain(oActivityProcesses, {}, EXIT_OR_SKIP_CONDITION, {
          name: "activities",
        }).then(
          function (_pData: any) {
            //console.log('##### Final result: ');
            //console.log( JSON.stringify( oResult ) );
            resolve(oResult);
          },
          function (pError: Error) {
            LOGGER.error("Errors during ETL process: [%j]", pError);
            reject(oResult);
          }
        );
      } catch (e) {
        LOGGER.error("Unexpected error.", e);
        reject(e);
      }
    });
  }
}

export default ETL;
