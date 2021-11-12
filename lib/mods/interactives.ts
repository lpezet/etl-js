import { AbstractMod, ModParameters, ModResult, ModStatus } from "../mod";
import { Executor } from "../executors";
import Context from "../context";
import { Logger, createLogger } from "../logger";
import * as Promises from "../promises";
import * as readline from "readline";

const LOGGER: Logger = createLogger("etljs::mods::interactives");

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

export type InteractivesState = {
  interactives: any[];
};

const asPromised = function(
  pResults: ModResult<InteractivesState>,
  pFunc: (results: any) => void,
  pParent: string,
  pKey: string,
  pData: Data
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
  // pResults.exit = pResults.exit || Boolean(pData["exit"]);
  // pResults.skip = pResults.skip || Boolean(pData["skip"]);
  if (pData.exit) pResults.status = ModStatus.EXIT;
  if (pData.skip) pResults.status = ModStatus.STOP;
  pResults.state?.interactives.push(data);
  pFunc(pResults);
};

export default class InteractivesMod extends AbstractMod<any, any> {
  mSettings: any;
  constructor(pSettings?: any) {
    super("interactives", pSettings || {});
  }
  _exec(
    pParent: string,
    pKey: string,
    pSpecs: any,
    _pExecutor: Executor,
    pContext: Context
  ): (data: any) => Promise<ModResult<InteractivesState>> {
    return (
      pResults: ModResult<InteractivesState>
    ): Promise<ModResult<InteractivesState>> => {
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
  handle(pParams: ModParameters): Promise<ModResult<InteractivesState>> {
    return new Promise((resolve, reject) => {
      LOGGER.debug("[%s] Processing Interactive...", pParams.parent);
      try {
        const oResult = { exit: false, skip: false, results: [] };
        const oPromises: ((data: any) => Promise<any>)[] = [];
        Object.keys(pParams.config).forEach(i => {
          const oTarget = i;
          LOGGER.debug("[%s] Interactive...", pParams.parent, oTarget);
          oPromises.push(
            this._exec(
              pParams.parent,
              i,
              pParams.config[i],
              pParams.executor,
              pParams.context
            )
          );
        });
        Promises.seq(oPromises, oResult).then(
          function(pData) {
            LOGGER.debug("[%s] Done processing interactives.", pParams.parent);
            resolve(pData);
          },
          function(pError) {
            LOGGER.error(
              "[%s] Error during interactives.",
              pParams.parent,
              pError
            );
            reject(pError);
          }
        );
      } catch (e) {
        reject(e);
        LOGGER.error(
          "[%s] Unexpected error processing interactives.",
          pParams.parent,
          e
        );
      }
    });
  }
}
