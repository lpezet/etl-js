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

var asPromised = function (
  pResults: any,
  pFunc: (results: any) => void,
  pParent: string,
  pKey: string,
  pData: any
) {
  LOGGER.debug("[%s] Interactive [%s] results:\n%j", pParent, pKey, pData);
  //if ( ! pPreviousData.commands[pKey] ) pPreviousData.commands[pKey] = {};
  //pPreviousData.commands[pKey] = data;
  var data = {
    interactive: pKey,
    results: pData,
    exit: Boolean(pData["exit"]),
    skip: Boolean(pData["skip"]),
  };
  //data[ pKey ] = pData;
  pResults.exit = pResults.exit || Boolean(pData["exit"]);
  pResults.skip = pResults.skip || Boolean(pData["skip"]);
  pResults.results.push(data);
  pFunc(pResults);
};

export default class InteractivesMod implements Mod {
  mSettings: any;
  constructor(pETL: IETL, pSettings?: any) {
    this.mSettings = pSettings || {};
    var that = this;
    if (pETL) {
      pETL.mod("interactives", this, function (pSettings) {
        that.mSettings = {
          ...that.mSettings,
          ...pSettings,
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
  ) {
    var that = this;
    return function (pResults: any) {
      //if ( pResults['_exit'] ) {
      //	return Promise.resolve( pResults );
      //}
      return new Promise(function (resolve, reject) {
        var data: Data = {
          result: null,
          exit: false,
          pass: true,
          skip: false,
          _stdout: null,
          _stderr: null,
        };
        const rlOpts = {
          input: that.mSettings["input"]
            ? that.mSettings["input"]
            : process.stdin,
          output: that.mSettings["output"]
            ? that.mSettings["output"]
            : process.stdout,
        };
        const rl = readline.createInterface(rlOpts);
        try {
          var prompt = pSpecs["prompt"];
          rl.question(prompt, (answer) => {
            rl.close();
            var oVarName = pSpecs["var"];
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
  ) {
    var that = this;
    return new Promise(function (resolve, reject) {
      LOGGER.debug("[%s] Processing Interactive...", pParent);
      try {
        var oResult = { exit: false, skip: false, results: [] };
        var oPromises = [];
        for (var i in pConfig) {
          var oTarget = i;
          LOGGER.debug("[%s] Interactive...", pParent, oTarget);
          oPromises.push(
            that._exec(pParent, i, pConfig[i], pExecutor, pContext)
          );
        }
        Promises.seq(oPromises, oResult).then(
          function (pData) {
            LOGGER.debug("[%s] Done processing interactives.", pParent);
            resolve(pData);
          },
          function (pError) {
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
