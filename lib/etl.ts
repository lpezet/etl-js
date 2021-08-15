import Mod from "./mod";
import { EventEmitter } from "events";
import { promises as fsPromises } from "fs";
import Context from "./context";
import { Executor } from "./executors";
import { Logger, createLogger } from "./logger";
import * as utils from "./utils";
import {
  ActivityParameters,
  ActivityResult,
  ActivityStatus,
  DefaultActivity
} from "./activity";

const LOGGER: Logger = createLogger("etljs::main");

export type ProcessState = {
  template: any;
  parameters?: any;
  activityKeys: string[];
  activityIndex: number;
  totalActivities: number;
  context: Context;
  etlResult: ETLResult;
};

export enum ETLStatus {
  DONE,
  IN_PROGRESS,
  EXIT
}

export type ETLResult = {
  // exit: boolean; // NOT SURE ABOUT THAT
  status: ETLStatus;
  activities: ActivityResult[];
  error?: Error;
};

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

const isExecutor = (pObject: any): boolean => {
  return pObject["writeFile"] !== undefined;
};

export abstract class AbstractETL extends EventEmitter implements IETL {
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
  _getModSettings(pSettings: any, pMod: string): any {
    if (!pSettings) return {};
    if (!pSettings["mods"]) return {};
    if (!pSettings["mods"][pMod]) return {};
    return pSettings["mods"][pMod];
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
    const modSettings = this._getModSettings(this.mSettings, pKey);
    if (pCallback) pCallback(modSettings);
  }
  abstract processTemplate(
    pTemplate: any,
    pParameters?: any
  ): Promise<ETLResult>;
}

class ETL extends AbstractETL {
  constructor(
    pExecutors: { [key: string]: Executor } | Executor,
    pSettings?: any
  ) {
    super(pExecutors, pSettings);
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
  _saveState(
    pTemplate: any,
    pActivityKeys: string[],
    pActivityIndex: number,
    pTotalActivities: number,
    pContext: Context,
    pETLResult: ETLResult,
    pParameters?: any
  ): Promise<void> {
    const state: ProcessState = {
      template: pTemplate,
      parameters: pParameters,
      activityKeys: pActivityKeys,
      activityIndex: pActivityIndex,
      totalActivities: pTotalActivities,
      context: pContext,
      etlResult: pETLResult
    };
    return fsPromises.writeFile("etl.state", JSON.stringify(state));
  }
  _processActivity(
    pTemplate: any,
    pActivityKeys: string[],
    pActivityIndex: number,
    pTotalActivities: number,
    pContext: Context,
    pETLResult: ETLResult,
    pParameters?: any,
    pLastActivityResult?: ActivityResult
  ): Promise<ActivityResult | undefined> {
    // TODO: This might be avoidable if this check is done before calling this method.
    const oActivityId = pActivityKeys.shift();
    if (oActivityId === undefined) return Promise.resolve(pLastActivityResult);
    const oActivityTemplate = pTemplate[oActivityId];
    if (!oActivityTemplate) {
      LOGGER.warn(
        "Nothing defined for activity [%s] (%s/%s). Skipping.",
        oActivityId,
        pActivityIndex,
        pTotalActivities
      );
      return this._processActivity(
        pTemplate,
        pActivityKeys,
        pActivityIndex++,
        pTotalActivities,
        pContext,
        pETLResult,
        pParameters,
        pLastActivityResult
      );
    }
    LOGGER.info(
      "[%s] Executing activity (%s/%s)...",
      oActivityId,
      pActivityIndex + 1,
      pTotalActivities
    );
    try {
      const oActivityParameters: ActivityParameters = {
        activityIndex: pActivityIndex,
        totalActivities: pTotalActivities,
        activityId: oActivityId,
        template: oActivityTemplate,
        context: pContext
      };
      const oActivity = new DefaultActivity(this);
      return oActivity.process(oActivityParameters).then(pActivityResult => {
        pETLResult.activities.push(pActivityResult);
        this.emit(
          "activityDone",
          oActivityId,
          null,
          pActivityResult,
          pActivityIndex,
          pTotalActivities
        );
        LOGGER.debug(
          "[%s] Checking activity status: [%s]",
          oActivityId,
          ActivityStatus[pActivityResult.status]
        );
        // console.log("######## _wrap_activity_process!!!! : ");
        // console.log(JSON.stringify(pData));
        console.log(pActivityResult);
        if (
          pActivityResult.status === ActivityStatus.STOP ||
          pActivityResult.status === ActivityStatus.EXIT
        ) {
          LOGGER.debug("[%s] Stopping/Exiting (skipping)...", oActivityId);
          // TODO: log exit behavior here. Use _exit_from to log which section triggered exit.
          // return Promise.resolve(oActivityId); // TODO: resolve?
          pActivityKeys.unshift(oActivityId);
          return this._saveState(
            pTemplate,
            pActivityKeys,
            pActivityIndex,
            pTotalActivities,
            pContext,
            pETLResult,
            pParameters
          ).then(() => {
            return pActivityResult;
          });
        } else {
          return this._processActivity(
            pTemplate,
            pActivityKeys,
            pActivityIndex++,
            pTotalActivities,
            pContext,
            pETLResult,
            pParameters,
            pActivityResult
          );
        }
      });
    } catch (e) {
      LOGGER.error("[%s] Error executing activity.", oActivityId);
      pETLResult.activities.push({
        id: oActivityId,
        status: ActivityStatus.EXIT,
        error: e
      });
      return Promise.reject(e); // TODO: check e
    }
  }
  processFromState(pState: ProcessState): Promise<ETLResult> {
    return this._processActivity(
      pState.template,
      pState.activityKeys,
      pState.activityIndex,
      pState.totalActivities,
      pState.context,
      pState.etlResult
    )
      .then((pActivityResult?: ActivityResult) => {
        if (pActivityResult === undefined) {
          // ????
          LOGGER.error(
            "This should not happen. Review logic here (ref: ABC123)"
          );
          return pState.etlResult;
        }
        // console.log("##### Final result: ");
        // console.log(JSON.stringify(pData));
        // console.log(pData);
        switch (pActivityResult.status) {
          case ActivityStatus.CONTINUE:
            pState.etlResult.status = ETLStatus.DONE;
            break;
          case ActivityStatus.STOP:
            pState.etlResult.status = ETLStatus.IN_PROGRESS; // not sure
            break;
          case ActivityStatus.EXIT:
            // TODO: anything else?
            pState.etlResult.status = ETLStatus.EXIT;
            pState.etlResult.error = pActivityResult.error;
            break;
        }
        return pState.etlResult;
      })
      .catch((pError: Error) => {
        // console.log("### ETL: ERROR");
        LOGGER.error("Errors during ETL process:\n", pError);
        return Promise.reject(pState.etlResult);
      });
  }
  processTemplate(pTemplate: any, pParameters?: any): Promise<ETLResult> {
    LOGGER.info("Starting ETL...");
    try {
      const oResult: ETLResult = {
        // exit: false,
        status: ETLStatus.DONE,
        activities: []
      };
      const oETLActivities = utils.resolveActivities(pTemplate, pParameters);
      LOGGER.info("...processing activities: %j", oETLActivities);
      if (!oETLActivities) {
        LOGGER.warn("Nothing to run.");
        return Promise.resolve(oResult);
      }
      const oTotalActivities = oETLActivities.length;
      const oContext: Context = this._createContext();
      const oState: ProcessState = {
        template: pTemplate,
        parameters: pParameters,
        activityIndex: 0,
        activityKeys: oETLActivities,
        context: oContext,
        etlResult: oResult,
        totalActivities: oTotalActivities
      };
      return this.processFromState(oState);
    } catch (e) {
      LOGGER.error("Unexpected error.", e);
      return Promise.reject(e);
    }
  }
}

export default ETL;
