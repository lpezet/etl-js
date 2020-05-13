import Mod from "./mod";
import { Executor } from "./executors";
import Context from "./context";
import { IETL } from "./etl";
import { createLogger } from "./logger";
import * as Promises from "./promises";
import * as readline from "readline";

const LOGGER = createLogger("etljs::interactives");

export type Data = {
  error?: Error | null;
  result?: any | null;
  message?: string | null;
  exit: boolean;
  pass: boolean;
  skip: boolean;
  _stdout?: string | null;
  _stderr?: string | null;
};

const asPromised = function(
  pResults: any,
  pFunc: (results: any) => void,
  pParent: string,
  pKey: string,
  pData: any
): void {
  LOGGER.debug("[%s] Interactive [%s] results:\n%j", pParent, pKey, pData);
  // if ( ! pPreviousData.commands[pKey] ) pPreviousData.commands[pKey] = {};
  // pPreviousData.commands[pKey] = data;
  const data = {
    interactive: pKey,
    results: pData,
    exit: Boolean(pData["exit"]),
    skip: Boolean(pData["skip"])
  };
  // data[ pKey ] = pData;
  pResults.exit = pResults.exit || Boolean(pData["exit"]);
  pResults.skip = pResults.skip || Boolean(pData["skip"]);
  pResults.results.push(data);
  pFunc(pResults);
};

export default class InteractivesMod implements Mod {
  mSettings: any;
  constructor(pETL: IETL, pSettings?: any) {
    this.mSettings = pSettings || {};
    if (pETL) {
      pETL.mod("interactives", this, (pSettings: any) => {
        this.mSettings = {
          ...this.mSettings,
          ...pSettings
        };
      });
    }
  }
  _exec(
    pParent: string,
    pKey: string,
    pSpecs: any,
    _pExecutor: Executor,
    pContext: Context
  ): (data: any) => Promise<any> {
    return (pResults: any) => {
      // if ( pResults['_exit'] ) {
      //	return Promise.resolve( pResults );
      // }
      return new Promise((resolve, reject) => {
        const data: Data = {
          result: null,
          exit: false,
          pass: true,
          skip: false,
          _stdout: null,
          _stderr: null
        };
        const rlOpts = {
          input: this.mSettings["input"]
            ? this.mSettings["input"]
            : process.stdin,
          output: this.mSettings["output"]
            ? this.mSettings["output"]
            : process.stdout
        };
        const rl = readline.createInterface(rlOpts);
        try {
          const prompt = pSpecs["prompt"];
          rl.question(prompt, answer => {
            rl.close();
            const oVarName = pSpecs["var"];
            if (oVarName) {
              pContext.vars[oVarName] = answer;
            }
            data.result = answer;
            asPromised(pResults, resolve, pParent, pKey, data);
          });
        } catch (e) {
          data.error = e;
          asPromised(pResults, reject, pParent, pKey, data);
        }
      });
    };
  }
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      LOGGER.debug("[%s] Processing Interactive...", pParent);
      try {
        const oResult = { exit: false, skip: false, results: [] };
        const oPromises: ((data: any) => Promise<any>)[] = [];
        Object.keys(pConfig).forEach(i => {
          const oTarget = i;
          LOGGER.debug("[%s] Interactive...", pParent, oTarget);
          oPromises.push(
            this._exec(pParent, i, pConfig[i], pExecutor, pContext)
          );
        });
        Promises.seq(oPromises, oResult).then(
          function(pData) {
            LOGGER.debug("[%s] Done processing interactives.", pParent);
            resolve(pData);
          },
          function(pError) {
            LOGGER.error("[%s] Error during interactives.", pParent, pError);
            reject(pError);
          }
        );
      } catch (e) {
        reject(e);
        LOGGER.error(
          "[%s] Unexpected error processing interactives.",
          pParent,
          e
        );
      }
    });
  }
}
