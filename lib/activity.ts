import * as Promises from "./promises";
import { IETL } from "./etl";
import { Executor } from "./executors";
import { Logger, createLogger } from "./logger";
import Mod, { ModParameters, ModResult, ModStatus } from "./mod";

const LOGGER: Logger = createLogger("etljs::activity");

const EXIT_OR_SKIP_CONDITION = function(
  _pValue: ModResult<any>,
  _pChainName: string
): boolean {
  /*
  console.log(
    "##########ACTIVITY: EXIT_OR_SKIP_CONDITION: Chain=%s, pValue=%j",
    _pChainName,
    _pValue
  );
  */
  // return pValue && (pValue["skip"] || pValue["exit"]);
  return false;
};

export interface ActivityParameters {
  activityIndex: number;
  totalActivities: number;
  activityId: string;
  template: any;
  // previousActivityData: any;
  // results: any;
  context: any;
}

export enum ActivityStatus {
  CONTINUE,
  STOP,
  REPEAT,
  EXIT
}

export interface ActivityResult {
  status: ActivityStatus;
  state?: any;
  error?: Error;
}

export interface Activity {
  process(pParams: ActivityParameters): Promise<ActivityResult>;
}

type StepWrap<T> = (pPreviousModResult: ModResult<T>) => Promise<ModResult<T>>;

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
        pPreviousModResult.status == ModStatus.STOP ||
        pPreviousModResult.status == ModStatus.EXIT
      ) {
        if (pPreviousModResult.status == ModStatus.EXIT) {
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
            pData = pData || {};
            // Reset ETL context
            pContext.etl.activityId = null;
            pContext.etl.activityIndex = 0;
            pContext.etl.stepName = null;
            // Setting skip/exit
            /*
            pPreviousModResult.state = pPreviousModResult.state || {};
            pPreviousModResult.state.skip =
              pPreviousModResult.state?.skip || Boolean(pData.state?.skip);
            pPreviousModResult.state.exit =
              pPreviousModResult.state?.exit || Boolean(pData.state?.exit);
            // pCurrentActivityData.results.push( { step: pKey, results: pData } );
            // pPreviousModResult.steps[pKey] = pData;
            // console.log('######## handle end!!!!');
            */
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
  process(pParams: ActivityParameters): Promise<ActivityResult> {
    const oProcesses: ((
      pPrevResult: ModResult<any>
    ) => Promise<ModResult<any>>)[] = [];
    const oActivityId = pParams.activityId;
    const oTemplate = pParams.template;
    const oActivityIndex = pParams.activityIndex;
    try {
      // TODO: Rename pPreviousStepData into pContext
      // pPreviousStepData[ pActivityId ] = {};
      let unknownModuleFound = false;
      const unknownMods: string[] = [];
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
      let oActivities: any = oTemplate["steps"];
      if (!oActivities) {
        LOGGER.warn(
          "[%s] Using legacy structure for activity. Now expecting activityName: { steps: { ... } }.",
          oActivityId
        );
        oActivities = oTemplate;
      }
      const oActivityResult: ActivityResult = {
        status: ActivityStatus.CONTINUE,
        state: {}
      };

      Object.keys(oActivities).forEach(i => {
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
        .then((_pModResult: ModResult<any>) => {
          // console.log('############ chained !!!!!');
          LOGGER.info(
            "[%s] Activity completed (%s/%s).",
            oActivityId,
            oActivityIndex,
            pParams.totalActivities
          );
          LOGGER.debug(
            "[%s] Activity results: %j",
            oActivityId,
            oActivityResult
          );
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
          /*
          const oResult = {
            activity: oActivityId,
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
            oActivityId,
            null,
            pData,
            pActivityIndex,
            pTotalActivities
          );
          return oResult;
          */
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
          /*
          this.emit(
            "activityDone",
            oActivityId,
            pError,
            null,
            oActivityIndex,
            pParams.totalActivities
          );
          */
          // return Promise.reject(pError);
          return oActivityResult; // Promise.resolve(oActivityResult);
        });
    } catch (e) {
      LOGGER.error("[%s] Unexpected error during activity.", oActivityId, e);
      return Promise.reject(e);
    }
  }
}
