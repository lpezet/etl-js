import Mod from "./mod";
import { EventEmitter } from "events";
import * as Promises from "./promises";
import Context from "./context";
import { Executor } from "./executors";
import { createLogger } from "./logger";
import * as utils from "./utils";
import {
  ActivityParameters,
  ActivityResult,
  ActivityStatus,
  DefaultActivity
} from "./activity";

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

export enum ETLStatus {
  RUNNING,
  DONE,
  IN_ERROR
}

export type ETLResult = {
  exit: boolean; // NOT SURE ABOUT THAT
  status: ETLStatus;
  activities: any;
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
  mod(pKey: string, pSource: Mod<any>, pCallback?: ModCallback): void;
  processTemplate(pTemplate: any, pParameters?: any): Promise<ETLResult>;
  getExecutor(pKey?: string): Executor | null; // if no key provided, return default executor, if any
  getMod(pKey: string): Mod<any> | null;
  emit(event: string | symbol, ...args: any[]): boolean;
}

export interface Activity {
  process(pTemplate: any): Promise<ActivityResult>;
}

type ActivityWrap = (data?: ActivityResult) => Promise<ActivityResult>;

const doCreateActivity = (
  pActivityIndex: number,
  pTotalActivities: number,
  pActivityId: string,
  pActivity: any,
  pContext: any,
  pETLResult: ETLResult,
  pETL: IETL
): ActivityWrap => {
  return function(pData?: ActivityResult): Promise<ActivityResult> {
    LOGGER.info(
      "[%s] Executing activity (%s/%s)...",
      pActivityId,
      pActivityIndex,
      pTotalActivities
    );
    if (pData) {
      LOGGER.debug(
        "[%s] Checking previous activity status: [%s]",
        pActivityId,
        pData.status
      );
      // console.log('######## _wrap_activity_process!!!! : ');
      // console.log( JSON.stringify( pData ) );
      if (
        pData.status === ActivityStatus.IN_PROGRESS ||
        pData.status === ActivityStatus.IN_ERROR
      ) {
        LOGGER.debug("[%s] Exiting (skipping)...", pActivityId);
        // TODO: log exit behavior here. Use _exit_from to log which section triggered exit.
        return Promise.resolve(pData); // TODO: resolve?
      }
    }
    try {
      const oActivityParameters: ActivityParameters = {
        activityIndex: pActivityIndex,
        totalActivities: pTotalActivities,
        activityId: pActivityId,
        template: pActivity,
        context: pContext
      };
      const oActivity = new DefaultActivity(pETL);
      return oActivity
        .process(oActivityParameters)
        .then(pActivityResult => {
          pETLResult.activities[pActivityId] = pActivityResult;
          pETL.emit(
            "activityDone",
            pActivityId,
            null,
            pActivityResult,
            pActivityIndex,
            pTotalActivities
          );
          return pActivityResult;
        })
        .catch(pError => {
          pETLResult.activities[pActivityId] = {
            status: ActivityStatus.IN_ERROR,
            error: pError
          };
          pETL.emit(
            "activityDone",
            pActivityId,
            pError,
            null,
            pActivityIndex,
            pTotalActivities
          );
          const oActivityResult: ActivityResult = {
            status: ActivityStatus.IN_ERROR,
            state: {},
            error: pError
          };
          return oActivityResult;
        });
    } catch (e) {
      LOGGER.error("[%s] Error executing activity.", pActivityId);
      pETLResult.activities[pActivityId] = {
        status: ActivityStatus.IN_ERROR,
        error: e
      };
      return Promise.reject(e); // TODO: check e
    }
  };
};

const isExecutor = (pObject: any): boolean => {
  return pObject["writeFile"] !== undefined;
};

class ETL extends EventEmitter implements IETL {
  mMods: { [key: string]: Mod<any> };
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
  getExecutor(pKey?: string): Executor | null {
    if (!pKey) {
      const oExecutorKey: string = this.mSettings["executor"] || "default";
      return this.mExecutors[oExecutorKey];
    } else {
      return this.mExecutors[pKey];
    }
  }
  getMods(): { [key: string]: Mod<any> } {
    return this.mMods;
  }
  getMod(pKey: string): Mod<any> | null {
    return this.mMods[pKey];
  }
  mod(
    pKey: string,
    pSource: Mod<any>,
    pCallback?: (settings?: any) => void
  ): void {
    if (this.mMods[pKey]) {
      throw new Error("Mod for " + pKey + " already registered.");
    }
    this.mMods[pKey] = pSource; // pFn.bind( pSource );
    const modSettings = getModSettings(this.mSettings, pKey);
    if (pCallback) pCallback(modSettings);
  }
  _createContext(): Context {
    const oContext: Context = {
      env: {},
      vars: {},
      etl: { activityId: null, activityIndex: 0, stepName: null }
    };
    Object.keys(process.env).forEach(i => {
      oContext.env[i] = process.env[i] || "";
    });
    return oContext;
  }
  processTemplate(pTemplate: any, pParameters?: any): Promise<ETLResult> {
    LOGGER.info("Starting ETL...");
    try {
      const oResult: ETLResult = {
        exit: false,
        status: ETLStatus.RUNNING,
        activities: []
      };
      const oETLActivities = utils.resolveActivities(pTemplate, pParameters);
      LOGGER.info("...processing activities: %j", oETLActivities);
      if (!oETLActivities) {
        LOGGER.warn("Nothing to run.");
        return Promise.resolve(oResult);
      }
      const oTotalActivities = oETLActivities.length;
      const oActivityProcesses = [];
      const oContext: Context = this._createContext();
      for (let i = 0; i < oETLActivities.length; i++) {
        const oActivityId = oETLActivities[i];
        const oActivityTemplate = pTemplate[oActivityId];
        // console.log('### etl: activity=' + oETLActivities[i]);
        if (!oActivityTemplate) {
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
          const oActivity = doCreateActivity(
            i + 1,
            oTotalActivities,
            oActivityId,
            oActivityTemplate,
            oContext,
            oResult,
            this
          );
          oActivityProcesses.push(oActivity);
          /*
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
          */
        }
      }
      return Promises.chain(
        oActivityProcesses,
        { status: ActivityStatus.DONE },
        EXIT_OR_SKIP_CONDITION,
        {
          name: "activities"
        }
      ).then(
        function(pData: ActivityResult) {
          // console.log("##### Final result: ");
          // console.log(JSON.stringify(pData));
          // console.log(pData);
          switch (pData.status) {
            case ActivityStatus.DONE:
            case ActivityStatus.IN_PROGRESS:
              oResult.status = ETLStatus.DONE;
              break;
            case ActivityStatus.IN_ERROR:
              oResult.status = ETLStatus.IN_ERROR;
              break;
          }
          return oResult;
        },
        function(pError: Error) {
          // console.log("### ETL: ERROR");
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
