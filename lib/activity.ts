import { IETL } from "./etl";
import { Executor } from "./executors";
import { Logger, createLogger } from "./logger";
import { ModParameters, ModResult, ModStatus } from "./mod";
import Context from "./context";

const LOGGER: Logger = createLogger("etljs::activity");
/*
const EXIT_OR_SKIP_CONDITION = function(
  _pValue: ModResult<any>,
  _pChainName: string
): boolean {
  console.log(
    "##########ACTIVITY: EXIT_OR_SKIP_CONDITION: Chain=%s, pValue=%j",
    _pChainName,
    _pValue
  );
  // return pValue && (pValue["skip"] || pValue["exit"]);
  return false;
};
*/

export interface ActivityParameters {
  activityIndex: number;
  totalActivities: number;
  activityId: string;
  template: any;
  // previousActivityData: any;
  // results: any;
  context: Context;
}

export enum ActivityStatus {
  CONTINUE,
  STOP,
  REPEAT,
  EXIT,
  ERROR
}

const translateModStatus = (pStatus: ModStatus): ActivityStatus => {
  switch (pStatus) {
    case ModStatus.CONTINUE:
      return ActivityStatus.CONTINUE;
    case ModStatus.EXIT:
      return ActivityStatus.EXIT;
    case ModStatus.REPEAT:
      throw new Error(
        "ModStatus REPEAT doesn't translate to Activity status (activity should repeat mod instead...no?)"
      );
    case ModStatus.STOP:
      return ActivityStatus.STOP;
    case ModStatus.SKIP:
      return ActivityStatus.CONTINUE; // here we skipped the rest of the mods, but we're still going
    default:
      throw new Error(
        `ModStatus ${pStatus} not supported here. Update code???`
      );
  }
};

export interface ActivityResult {
  id: string;
  status: ActivityStatus;
  state?: any;
  error?: Error;
}

export interface Activity {
  process(pParams: ActivityParameters): Promise<ActivityResult>;
}

// type StepWrap<T> = (pPreviousModResult: ModResult<T>) => Promise<ModResult<T>>;
/*
const wrapStep = (
  pActivityIndex: number,
  pActivityId: string,
  pKey: string,
  pStep: any,
  pMod: Mod<any>,
  pContext: any,
  pExecutor: Executor,
  pActivityResult: ActivityResult
): StepWrap<any> => {
  return function(pPreviousModResult: ModResult<any>): Promise<ModResult<any>> {
    try {
      if (
        pPreviousModResult.status === ModStatus.STOP ||
        pPreviousModResult.status === ModStatus.EXIT ||
        pPreviousModResult.status === ModStatus.SKIP
      ) {
        if (pPreviousModResult.status === ModStatus.EXIT) {
          pActivityResult.status = ActivityStatus.EXIT;
        }
        LOGGER.debug("[%s] Skipping step [%s] (skip/exit).", pActivityId, pKey);
        return Promise.resolve(pPreviousModResult);
        // if (
        //  pPreviousModResult &&
        //  pPreviousModResult.state &&
        //  (pPreviousModResult.state["skip"] || pPreviousModResult.state["exit"])
        // ) {
        //  LOGGER.debug("[%s] Skipping step [%s] (skip/exit).", pActivityId, pKey);
        //  return Promise.resolve(pPreviousModResult);
      } else if (pMod.isDisabled()) {
        LOGGER.warn("[%s] Skipping step [%s] (disabled).", pActivityId, pKey);
        return Promise.resolve(pPreviousModResult);
      } else {
        // console.log('## etl: Returning handle() for ' + pActivityId);
        LOGGER.debug("[%s] Executing step [%s]...", pActivityId, pKey);
        // return new Promise(function(resolve, reject) {
        // return
        pContext.etl.activityId = pActivityId;
        pContext.etl.activityIndex = pActivityIndex;
        pContext.etl.stepName = pKey;
        const oModParameters: ModParameters = {
          parent: pActivityId,
          config: pStep,
          executor: pExecutor,
          context: pContext
        };
        return pMod
          .handle(oModParameters) // pCurrentActivityData, pResults, pContext )
          .then((pData: ModResult<any>) => {
            // TODO: Append to activity state and such
            pActivityResult.state[pKey] = pData;
            // console.log("######## handle!!!!");
            // console.log(JSON.stringify(pData));
            // pData = pData || {};
            // Reset ETL context
            pContext.etl.activityId = null;
            pContext.etl.activityIndex = 0;
            pContext.etl.stepName = null;
            // Setting skip/exit
            
            // pPreviousModResult.state = pPreviousModResult.state || {};
            // pPreviousModResult.state.skip =
            //  pPreviousModResult.state?.skip || Boolean(pData.state?.skip);
            // pPreviousModResult.state.exit =
            //  pPreviousModResult.state?.exit || Boolean(pData.state?.exit);
            // pCurrentActivityData.results.push( { step: pKey, results: pData } );
            // pPreviousModResult.steps[pKey] = pData;
            // console.log('######## handle end!!!!');
            
            return pData;
            // return pPreviousModResult;
          })
          .catch(pError => {
            throw pError;
          });
        // });
      }
    } catch (e) {
      LOGGER.error("[%s] Error executing step [%s].", pActivityId, pKey, e);
      // console.log("##### THROWING ERROR:");
      // console.log(e);
      throw e;
    }
  };
};
*/
export class DefaultActivity implements Activity {
  mETL: IETL;
  constructor(pETL: IETL) {
    this.mETL = pETL;
  }
  _resolveExecutor(pActivityId: string, pTemplate: any): Executor | null {
    let oExecutor: Executor | null = this.mETL.getExecutor();
    const oExecutorKey = pTemplate["executor"];
    if (typeof oExecutorKey === "string") {
      oExecutor = this.mETL.getExecutor(oExecutorKey);
      if (!oExecutor) {
        LOGGER.error(
          "[%s] Could not find executor [%s]. Aborting.",
          pActivityId
        );
        return null;
      }
    }
    return oExecutor;
  }
  _processStep(
    pParams: ActivityParameters,
    pModKey: string,
    pModTemplate: any,
    // pRemainingSteps: string[],
    // pStepKeys: string[],
    // pStepsTemplate: any,
    pExecutor: Executor
  ): Promise<ModResult<any>> {
    const oActivityId = pParams.activityId;
    // const oTemplate = pParams.template;
    // const oStepKey = pStepKeys.shift();
    LOGGER.debug("[%s] Processing mod [%s]", oActivityId, pModKey);
    LOGGER.debug(
      "[%s] Context variables right now: [%j]",
      oActivityId,
      pParams.context.vars
    );
    if (pModKey === undefined) {
      return Promise.reject(
        new Error("Must pass non-empty array of step/mod keys (2).")
      );
    }
    const oMod = this.mETL.getMod(pModKey);
    if (!oMod) {
      LOGGER.error("[%s] ...mod [%s] unknown.", oActivityId, pModKey);
      return Promise.reject(
        new Error(`Unknown module [${pModKey}] in activity [${oActivityId}].`)
      );
    }
    if (oMod.isDisabled()) {
      LOGGER.info(
        "[%s] Mod [%s] disabled. Continuing...",
        oActivityId,
        pModKey
      );
      return Promise.resolve({ status: ModStatus.CONTINUE });
    }
    // TODO: This is not ideal. Find another way?
    pParams.context.etl.activityId = oActivityId;
    pParams.context.etl.activityIndex = pParams.activityIndex; // TODO!!! Should we have a "sub index"?? like dot notation: 1.1, 1.2, 1.3, etc.;
    pParams.context.etl.stepName = pModKey;
    const oModParameters: ModParameters = {
      parent: oActivityId,
      config: pModTemplate,
      executor: pExecutor,
      context: pParams.context
    };
    return oMod.handle(oModParameters).then((pData: ModResult<any>) => {
      // TODO: Append to activity state and such
      pParams.context.etl.activityId = null;
      pParams.context.etl.activityIndex = 0;
      pParams.context.etl.stepName = null;
      return pData;
      /*
      if (pRemainingSteps.length == 0) {
        LOGGER.debug("[%s] No more mods to process.", oActivityId);
        return pData;
      } else {
        LOGGER.debug(
          "[%s] Processing next step (stack: %s)...",
          oActivityId,
          pStepKeys
        );
        return this._processSteps(
          pParams,
          pStepKeys,
          pStepsTemplate,
          pExecutor,
          pActivityResult
        );
      }
      */
    });
  }
  _processSteps(
    pParams: ActivityParameters,
    pStepKeys: string[],
    pStepsTemplate: any,
    pExecutor: Executor,
    pActivityResult: ActivityResult
  ): Promise<ModResult<any>> {
    const oActivityId = pParams.activityId;
    const oTemplate = pStepsTemplate;
    const oStepKey = pStepKeys.shift();
    if (oStepKey === undefined) {
      return Promise.reject(
        new Error("Must pass non-empty array of step/mod keys.")
      );
    }
    // legacy structure
    if (oStepKey === "executor") {
      return this._processSteps(
        pParams,
        pStepKeys,
        pStepsTemplate,
        pExecutor,
        pActivityResult
      );
    }
    LOGGER.debug(
      "[%s] Processing step [%s] (stack: %s)...",
      oActivityId,
      oStepKey,
      pStepKeys
    );
    const stepRegex = /step.*/i;
    const oMatches = stepRegex.exec(oStepKey);
    if (oMatches && oMatches.length > 0) {
      const oStepsTemplate = oTemplate[oStepKey];
      const oStepKeys = Object.keys(oTemplate[oStepKey]);
      return this._processSteps(
        pParams,
        oStepKeys,
        oStepsTemplate,
        pExecutor,
        pActivityResult
      ).then(pData => {
        if (pStepKeys.length > 0) {
          return this._processSteps(
            pParams,
            pStepKeys,
            pStepsTemplate,
            pExecutor,
            pActivityResult
          );
        } else {
          return pData;
        }
      });
    } else {
      return this._processStep(
        pParams,
        oStepKey,
        oTemplate[oStepKey],
        pExecutor
      ).then((pData: ModResult<any>) => {
        pActivityResult.state[oStepKey] = pData;
        LOGGER.debug(
          "[%s] Got results from [%s] (status=%s)...",
          oActivityId,
          oStepKey,
          ModStatus[pData.status]
        );
        if (pStepKeys.length > 0 && pData.status === ModStatus.CONTINUE) {
          LOGGER.debug(
            "[%s] ...processing next step from %s...",
            oActivityId,
            pStepKeys
          );
          return this._processSteps(
            pParams,
            pStepKeys,
            pStepsTemplate,
            pExecutor,
            pActivityResult
          );
        } else {
          return pData;
        }
      });
    }
  }
  process(pParams: ActivityParameters): Promise<ActivityResult> {
    // const oProcesses: ((
    //   pPrevResult: ModResult<any>
    // ) => Promise<ModResult<any>>)[] = [];
    const oActivityId = pParams.activityId;
    const oTemplate = pParams.template;
    const oActivityIndex = pParams.activityIndex;
    const oActivityResult: ActivityResult = {
      id: oActivityId,
      status: ActivityStatus.CONTINUE,
      state: {}
    };
    let oStepsTemplate = pParams.template;
    LOGGER.debug(
      "[%s] Processing activity #%s...",
      oActivityId,
      oActivityIndex
    );
    try {
      // TODO: Rename pPreviousStepData into pContext
      // pPreviousStepData[ pActivityId ] = {};
      // const unknownModuleFound = false;
      // const unknownMods: string[] = [];
      const oExecutor: Executor | null = this._resolveExecutor(
        oActivityId,
        oTemplate
      );
      if (oExecutor === null) {
        LOGGER.error("[%s] No executor. Aborting.", oActivityId);
        return Promise.reject(
          new Error("No executor found for activity [" + oActivityId + "].")
        );
      }
      let oStepKeys: string[] = [];
      if (oTemplate["steps"] != undefined) {
        oStepsTemplate = oTemplate["steps"];
        oStepKeys = Object.keys(oStepsTemplate);
      } else {
        LOGGER.warn(
          "[%s] Using legacy structure for activity. Now expecting activityName: { steps: { ... } }.",
          oActivityId
        );
        oStepKeys = Object.keys(oTemplate);
      }
      LOGGER.debug("[%s] Processing steps %s...", oActivityId, oStepKeys);
      // Processing steps

      if (oStepKeys.length === 0) {
        LOGGER.debug("[%s] No steps. Returning.");
        return Promise.resolve(oActivityResult);
      }
      return this._processSteps(
        pParams,
        oStepKeys,
        oStepsTemplate,
        oExecutor,
        oActivityResult
      )
        .then((pData: ModResult<any>) => {
          // TODO: anything to do with pData???
          LOGGER.info(
            "[%s] Activity completed (%s/%s).",
            oActivityId,
            oActivityIndex + 1,
            pParams.totalActivities
          );
          LOGGER.debug(
            "[%s] Activity results: %j",
            oActivityId,
            oActivityResult
          );
          oActivityResult.status = translateModStatus(pData.status);
          return oActivityResult;
        })
        .catch((pError: Error) => {
          LOGGER.error(
            "[%s] Errors during activity:\n",
            oActivityId,
            JSON.stringify(pError, null, 2)
          );
          return Promise.reject(pError);
          /*
          oActivityResult.status = ActivityStatus.ERROR;
          oActivityResult.error = pError;
          // throw pError;
          return oActivityResult;
          */
        });
      /*
      Object.keys(oSteps).forEach(i => {
        if (i === "executor") return; // legacy structure
        LOGGER.debug("[%s] Encountered [%s]...", oActivityId, i);
        let oMod = this.mETL.getMod(i);
        // console.log('## etl: Activity ' + pActivityId + ' mod=' + i);
        if (oMod && !unknownModuleFound) {
          LOGGER.debug("[%s] ...adding mod [%s] to chain...", oActivityId, i);
          oProcesses.push(
            wrapStep(
              oActivityIndex,
              oActivityId,
              i,
              oActivities[i],
              oMod,
              pParams.context,
              oExecutor,
              oActivityResult
            )
          );
        } else if (!oMod) {
          const oStepMods: string[] = Object.keys(oActivities[i]);
          if (oStepMods && oStepMods.length > 0) {
            oStepMods.forEach(j => {
              oMod = this.mETL.getMod(j);
              if (!oMod) {
                LOGGER.error("[%s] ...mod [%s] unknown.", oActivityId, i);
                unknownMods.push(i);
                // return Promise.reject(new Error("Unknow module " + pActivityId));
                unknownModuleFound = true;
              } else if (!unknownModuleFound) {
                LOGGER.debug(
                  "[%s] ...adding mod [%s] to chain under [%s]...",
                  oActivityId,
                  j,
                  i
                );
                oProcesses.push(
                  wrapStep(
                    oActivityIndex,
                    oActivityId + "::" + i,
                    j,
                    oActivities[i][j],
                    oMod,
                    pParams.context,
                    oExecutor,
                    oActivityResult
                  )
                );
              }
            });
          } else {
            LOGGER.error("[%s] ...mod [%s] unknown.", oActivityId, i);
            unknownMods.push(i);
            // return Promise.reject(new Error("Unknow module " + pActivityId));
            unknownModuleFound = true;
          }
        }
      });

      if (unknownModuleFound) {
        return Promise.reject(
          new Error(
            `Found unknown module(s) for activity [${oActivityId}]: ${unknownMods}`
          )
        );
      }
      // Promises.seq( oProcesses, pPreviousActivityData )
      
      return Promises.chain(
        oProcesses,
        {
          status: ModStatus.CONTINUE
        } as ModResult<any>,
        // pPreviousActivityData
        EXIT_OR_SKIP_CONDITION,
        { name: "steps" }
      )
        .then((pModResult: ModResult<any>) => {
          // console.log('############ chained !!!!!');
          oActivityResult.status = translateModStatus(pModResult.status);
          LOGGER.info(
            "[%s] Activity completed (%s/%s).",
            oActivityId,
            oActivityIndex + 1,
            pParams.totalActivities
          );
          LOGGER.debug(
            "[%s] Activity results: %j",
            oActivityId,
            oActivityResult
          );
          // console.log(' pData=' );
          // console.log( JSON.stringify( pData ) );

          return oActivityResult;
        })
        .catch((pError: Error) => {
          // console.log("#### CATCHING ERROR:");
          // console.log(pError);
          LOGGER.error("[%s] Errors during activity.", oActivityId, pError);
          // console.log('etl._process: (3) pDataResults = ' + pDataResults);
          // pContext[ pActivityId ] = pError; //TODO:????
          oActivityResult.status = ActivityStatus.EXIT; // TODO: sure about this?
          oActivityResult.error = pError;
          // console.log("#### ActivityResult = ");
          // console.log(oActivityResult);
          // return Promise.reject(pError);
          return oActivityResult; // Promise.resolve(oActivityResult);
        });
        */
    } catch (e) {
      LOGGER.error("[%s] Unexpected error during activity:\n", oActivityId, e);
      // oActivityResult.status = ActivityStatus.ERROR;
      // oActivityResult.error = e;
      // TODO: not sure about that here...should we just let the error through???
      // return Promise.resolve(oActivityResult);
      return Promise.reject(e);
    }
  }
}
