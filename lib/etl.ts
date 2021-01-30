import Mod from "./mod";
import { EventEmitter } from "events";
import * as Promises from "./promises";
import Context from "./context";
import { Executor } from "./executors";
import { createLogger } from "./logger";

const LOGGER = createLogger("etljs::main");

const EXIT_OR_SKIP_CONDITION = function(
  _pValue: any,
  _pChainName: string
): boolean {
  /*
  console.log(
    "##########EXIT_OR_SKIP_CONDITION: Chain=%s, pValue=%j",
    _pChainName,
    _pValue
  );
  */
  // return pValue && (pValue["skip"] || pValue["exit"]);
  return false;
};

export type ETLResult = {
  exit: boolean;
  activities: any;
};

type ETLSets = {
  [key: string]: Array<string | ETLSetRef>;
};
type ETLSetRef = {
  etlSet: string;
};
type ETLSetStack = {
  key: string;
  value: Array<string | ETLSetRef>;
  tries: number;
};

/**
 * @param pSettings settings
 * @param pMod mod
 * @return mod settings
 */
function getModSettings(pSettings: any, pMod: string): any {
  if (!pSettings) return {};
  if (!pSettings["mods"]) return {};
  if (!pSettings["mods"][pMod]) return {};
  return pSettings["mods"][pMod];
}

export type ModCallback = (settings?: any) => void;

export interface IETL {
  mod(pKey: string, pSource: Mod, pCallback?: ModCallback): void;
  processActivity(
    pActivityIndex: number,
    pTotalActivities: number,
    pActivityId: string,
    pActivity: any,
    _pPreviousActivityData: any,
    pResults: any,
    pContext: any
  ): Promise<any>;
}

const doWrapActivityProcess = (
  pStepIndex: number,
  pTotalSteps: number,
  pActivityId: string,
  pActivity: any,
  pResults: ETLResult,
  pContext: any,
  pETL: ETL
): ((data: any) => Promise<any>) => {
  return function(pData: any) {
    LOGGER.info(
      "[%s] Executing activity (%s/%s)...",
      pActivityId,
      pStepIndex,
      pTotalSteps
    );
    LOGGER.debug("[%s] Checking to exit: [%s]", pActivityId, pData["exit"]);
    // console.log('######## _wrap_activity_process!!!! : ');
    // console.log( JSON.stringify( pData ) );
    if (pData["exit"]) {
      LOGGER.debug("[%s] Exiting (skipping)...", pActivityId);
      // TODO: log exit behavior here. Use _exit_from to log which section triggered exit.
      return Promise.resolve(pData); // TODO: resolve?
    } else {
      try {
        return pETL.processActivity(
          pStepIndex,
          pTotalSteps,
          pActivityId,
          pActivity,
          pData,
          pResults,
          pContext
        );
      } catch (e) {
        LOGGER.error("[%s] Error executing activity.", pActivityId);
        return Promise.reject(e); // TODO: check e
      }
    }
  };
};

const doStepProcess = (
  pActivityIndex: number,
  pActivityId: string,
  pKey: string,
  pStep: any,
  pMod: Mod,
  _pResult: ETLResult,
  pContext: any,
  pExecutor: Executor
): ((data: any) => void) => {
  return function(pCurrentActivityData: any) {
    try {
      if (
        pCurrentActivityData &&
        (pCurrentActivityData["skip"] || pCurrentActivityData["exit"])
      ) {
        LOGGER.debug("[%s] Skipping step %s (skip/exit).", pActivityId, pKey);
        return Promise.resolve(pCurrentActivityData);
      } else if (pMod.isDisabled()) {
        LOGGER.warn("[%s] Skipping step %s (disabled).", pActivityId, pKey);
        return Promise.resolve(pCurrentActivityData);
      } else {
        // console.log('## etl: Returning handle() for ' + pActivityId);
        LOGGER.debug("[%s] Executing step %s...", pActivityId, pKey);
        // return new Promise(function(resolve, reject) {
        // return
        pContext.etl.activityId = pActivityId;
        pContext.etl.activityIndex = pActivityIndex;
        pContext.etl.stepName = pKey;
        return pMod
          .handle(pActivityId, pStep, pExecutor, pContext) // pCurrentActivityData, pResults, pContext )
          .then((pData: any) => {
            // console.log('######## handle!!!!');
            // console.log( JSON.stringify( pData ) );
            pData = pData || {};
            // Reset ETL context
            pContext.etl.activityId = null;
            pContext.etl.activityIndex = 0;
            pContext.etl.stepName = null;
            // Setting skip/exit
            pCurrentActivityData.skip =
              pCurrentActivityData.skip || Boolean(pData["skip"]);
            pCurrentActivityData.exit =
              pCurrentActivityData.exit || Boolean(pData["exit"]);
            // pCurrentActivityData.results.push( { step: pKey, results: pData } );
            pCurrentActivityData.steps[pKey] = pData;
            // console.log('######## handle end!!!!');
            return pCurrentActivityData;
          });
        // });
      }
    } catch (e) {
      LOGGER.error("[%s] Error executing step for [%s].", pActivityId, pKey, e);
      throw e;
    }
  };
};

const isExecutor = (pObject: any): boolean => {
  return pObject["writeFile"] !== undefined;
};

class ETL extends EventEmitter implements IETL {
  mMods: { [key: string]: Mod };
  mSettings: any;
  mExecutors: { [key: string]: Executor };
  constructor(
    pExecutors: { [key: string]: Executor } | Executor,
    pSettings?: any
  ) {
    super();
    this.mSettings = pSettings || {};
    this.mMods = {};
    if (isExecutor(pExecutors)) {
      this.mExecutors = { default: pExecutors as Executor };
    } else {
      this.mExecutors = pExecutors as { [key: string]: Executor };
    }
  }
  getMods(): { [key: string]: Mod } {
    return this.mMods;
  }
  mod(pKey: string, pSource: Mod, pCallback?: (settings?: any) => void): void {
    if (this.mMods[pKey]) {
      throw new Error("Mod for " + pKey + " already registered.");
    }
    this.mMods[pKey] = pSource; // pFn.bind( pSource );
    const modSettings = getModSettings(this.mSettings, pKey);
    if (pCallback) pCallback(modSettings);
  }
  _stepProcess(
    pActivityIndex: number,
    pActivityId: string,
    pKey: string,
    pStep: any,
    pHandler: Mod,
    _pResult: ETLResult,
    pContext: any,
    pExecutor: Executor
  ): any {
    // pCurrentActivityData: { exit: true|false, skip: true|false, steps: {} }
    return doStepProcess(
      pActivityIndex,
      pActivityId,
      pKey,
      pStep,
      pHandler,
      _pResult,
      pContext,
      pExecutor
    );
  }
  _resolveExecutorKey(pActivityId: string, pActivity: any): string {
    let oExecutorKey: string = this.mSettings["executor"] || "default";
    if (pActivity["executor"]) {
      oExecutorKey = pActivity["executor"];
    }
    if (oExecutorKey === "") {
      LOGGER.error(
        "[%s] Executor not defined in neither activity nor settings.",
        pActivityId
      );
    }
    return oExecutorKey;
  }
  processActivity(
    pActivityIndex: number,
    pTotalActivities: number,
    pActivityId: string,
    pActivity: any,
    _pPreviousActivityData: any,
    pResult: ETLResult,
    pContext: any
  ): Promise<any> {
    const oProcesses: ((res: any) => Promise<any>)[] = [];
    try {
      // TODO: Rename pPreviousStepData into pContext
      // pPreviousStepData[ pActivityId ] = {};
      let unknownModuleFound = false;
      const oExecutorKey: string = this._resolveExecutorKey(
        pActivityId,
        pActivity
      );
      const oExecutor: Executor | undefined = this.mExecutors[oExecutorKey];
      if (oExecutor === undefined) {
        LOGGER.error(
          "[%s] Could not find executor [%s] for activity.",
          pActivityId,
          oExecutorKey
        );
        return Promise.reject(
          new Error(
            "Could not find executor [" +
              oExecutorKey +
              "] for activity [" +
              pActivityId +
              "]."
          )
        );
      }
      let oActivities: any = pActivity["steps"];
      if (!oActivities) {
        LOGGER.warn(
          "Using legacy structure for activities. Now expecting activityName: { steps: { ... } }."
        );
        oActivities = pActivity;
      }
      Object.keys(oActivities).forEach(i => {
        if (i === "executor") return; // legacy structure
        const oMod = this.mMods[i];
        LOGGER.debug("[%s] Encountered [%s]...", pActivityId, i);
        // console.log('## etl: Activity ' + pActivityId + ' mod=' + i);
        if (!oMod) {
          LOGGER.error("[%s] ...mod [%s] unknown.", pActivityId, i);
          // return Promise.reject(new Error("Unknow module " + pActivityId));
          unknownModuleFound = true;
        } else {
          LOGGER.debug("[%s] ...adding mod [%s] to chain...", pActivityId, i);
          oProcesses.push(
            this._stepProcess(
              pActivityIndex,
              pActivityId,
              i,
              pActivity[i],
              oMod,
              pResult,
              pContext,
              oExecutor
            )
          );
        }
      });

      if (unknownModuleFound) {
        return Promise.reject(new Error("Unknow module " + pActivityId));
      }
      // Promises.seq( oProcesses, pPreviousActivityData )

      return Promises.chain(
        oProcesses,
        {
          exit: false,
          skip: false,
          steps: {}
        },
        // pPreviousActivityData
        EXIT_OR_SKIP_CONDITION,
        { name: "steps" }
      ).then(
        (pData: any) => {
          // console.log('############ chained !!!!!');
          LOGGER.info(
            "[%s] Activity completed (%s/%s).",
            pActivityId,
            pActivityIndex,
            pTotalActivities
          );
          LOGGER.debug("[%s] Activity results: %j", pActivityId, pData);
          // console.log(' pData=' );
          // console.log( JSON.stringify( pData ) );

          /*
                  console.log('etl._process: (2) pPreviousStepData = ');
                  console.log(util.inspect(pPreviousStepData, false, null, true))
                  console.log('etl._process: (2) pDataResults = ');
                  console.log(util.inspect(pDataResults, false, null, true))
                  console.log('etl._process: (2) pData = ');
                  console.log(util.inspect(pData, false, null, true))
                  */

          // TODO: no need then:
          const oResult = {
            activity: pActivityId,
            steps: pData["steps"],
            exit: Boolean(pData["exit"]),
            skip: Boolean(pData["skip"])
          };
          if (pData["exit"]) pResult.exit = pData["exit"];
          pResult.activities.push(oResult);
          // pResult[ pActivityId ] = pData;
          // TODO: replace with:
          // resolve( pPreviousStepData );
          this.emit(
            "activityDone",
            pActivityId,
            null,
            pData,
            pActivityIndex,
            pTotalActivities
          );
          return oResult;
        },
        (pError: Error) => {
          LOGGER.error("[%s] Errors during activity.", pActivityId, pError);
          // console.log('etl._process: (3) pDataResults = ' + pDataResults);
          // pContext[ pActivityId ] = pError; //TODO:????
          const oResult = { activity: pActivityId, error: pError };
          pResult.activities.push(oResult);

          this.emit(
            "activityDone",
            pActivityId,
            pError,
            null,
            pActivityIndex,
            pTotalActivities
          );
          return Promise.reject(pError);
        }
      );
    } catch (e) {
      LOGGER.error("[%s] Unexpected error during activity.", pActivityId, e);
      return Promise.reject(e);
    }
  }
  _resolveEtlSets(pETLs: ETLSets): any {
    const oStack: ETLSetStack[] = [];
    Object.keys(pETLs).forEach(i => {
      oStack.push({ key: i, value: pETLs[i], tries: 0 });
    });
    let s: ETLSetStack | undefined;
    const oResolved: any = {};
    while (oStack.length > 0) {
      s = oStack.shift();
      if (s === undefined) {
        LOGGER.error(
          "Expected more elements in stack: length=" + oStack.length,
          oStack
        );
        break; // TODO:???
      }
      const k = s.key;
      // console.log('## Working on: ' + k);
      let nv: any[] = []; // new values
      let oResolveLater = false;
      const val = s.value;
      if (Array.isArray(val)) {
        s.value.forEach(v => {
          const oValType = typeof v;
          switch (oValType) {
            case "string":
              nv.push(v);
              break;
            case "object": {
              const oRef: string = (v as ETLSetRef).etlSet;

              // TODO: throw error if not present
              if (!oResolved[oRef]) {
                // console.log( 'Need to resolve later: ' + k);
                if (s != undefined) {
                  if (s.tries > 5) {
                    throw new Error(
                      "Infinite loop detected with (at least) entry [" +
                        k +
                        "]."
                    );
                  }
                  s.tries++;
                  oStack.push(s); // resolve it later
                }

                oResolveLater = true;
              } else {
                nv = nv.concat(oResolved[oRef]);
              }
              break;
            }
            default:
              throw new Error(
                k + ": value type " + oValType + " not supported."
              );
          }
          if (oResolveLater) return;
        });
      } else {
        nv.push(val);
      }
      if (!oResolveLater) {
        // console.log("### Resolved " + k);
        oResolved[k] = nv;
      }
    }
    return oResolved;
  }
  _resolveActivities(pConfig: any, pParameters: any): any {
    if (pConfig["etl"]) return pConfig["etl"];
    if (pConfig["etlSets"]) {
      const oResolvedETLs = this._resolveEtlSets(pConfig["etlSets"] as ETLSets);
      const etlSet = oResolvedETLs[pParameters["etlSet"] || "default"];
      if (etlSet) return etlSet;
      LOGGER.warn(
        "Could not find etlSet [%s]. Using it as an activity name instead.",
        pParameters["etlSet"]
      );
      return [pParameters["etlSet"]]; // as activity
    } else {
      if (pConfig === "" || (Array.isArray(pConfig) && pConfig.length === 0)) {
        throw new Error(
          "Either etl, etlSets, or some root element must be provided in template."
        );
      }
      const root = Object.keys(pConfig)[0];
      return [root];
    }
  }
  /*
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ): Promise<any> {
    const oTotalActivities = pConfig.length;
    const oActivityProcesses = [];
    for (let i = 0; i < oTotalActivities; i++) {
      const oActivityId = pConfig[i];
      const oActivity = pConfig[oActivityId];
    }
  }
  */
  process(pConfig: any, pParameters?: any): Promise<any> {
    LOGGER.info("Starting ETL...");
    try {
      const oResult: ETLResult = {
        exit: false,
        activities: []
      };
      const oETLActivities = this._resolveActivities(pConfig, pParameters);
      LOGGER.debug("Processing activities: %j", oETLActivities);
      if (!oETLActivities) {
        LOGGER.warn("Nothing to run.");
        return Promise.resolve(oResult);
      }
      const oTotalActivities = oETLActivities.length;
      const oActivityProcesses = [];
      const oContext: Context = {
        env: {},
        vars: {},
        etl: { activityId: null, activityIndex: 0, stepName: null }
      };
      Object.keys(process.env).forEach(i => {
        oContext.env[i] = process.env[i] || "";
      });
      for (let i = 0; i < oETLActivities.length; i++) {
        const oActivityId = oETLActivities[i];
        const oActivity = pConfig[oActivityId];
        // console.log('### etl: activity=' + oETLActivities[i]);
        if (!oActivity) {
          // TODO
          LOGGER.warn(
            "Nothing defined for activity [%s] (%s/%s). Skipping.",
            oActivityId,
            i + 1,
            oTotalActivities
          );
        } else {
          LOGGER.debug("Encountered activity [%s]...", oActivityId);
          // console.log('## etl: Activity found: ' + oActivityId);
          oActivityProcesses.push(
            doWrapActivityProcess(
              i + 1,
              oTotalActivities,
              oActivityId,
              oActivity,
              oResult,
              oContext,
              this
            )
          );
        }
      }
      return Promises.chain(oActivityProcesses, {}, EXIT_OR_SKIP_CONDITION, {
        name: "activities"
      }).then(
        function(_pData: any) {
          // console.log('##### Final result: ');
          // console.log( JSON.stringify( oResult ) );
          return oResult;
        },
        function(pError: Error) {
          LOGGER.error("Errors during ETL process: [%j]", pError);
          return Promise.reject(oResult);
        }
      );
    } catch (e) {
      LOGGER.error("Unexpected error.", e);
      return Promise.reject(e);
    }
  }
}

export default ETL;
