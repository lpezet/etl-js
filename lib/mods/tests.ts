import { AbstractMod, ModParameters, ModResult, ModStatus } from "../mod";
import { Executor } from "../executors";
import Context from "../context";
import { Logger, createLogger } from "../logger";
import * as Promises from "../promises";
import TemplateEngine from "../templating/engine";
import { compileExpression } from "filtrex";

const LOGGER: Logger = createLogger("etljs::mods::tests");

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

export type State = {
  tests: any[];
};

export type Specs = {
  vars?: { [key: string]: string };
  assertions?: string[];
};

const asPromised = function(
  pResults: ModResult<State>,
  pFunc: (results: any) => void,
  pParent: string,
  pKey: string,
  pData: Data
): void {
  LOGGER.debug("[%s] Tests [%s] results:\n%j", pParent, pKey, pData);
  // if ( ! pPreviousData.commands[pKey] ) pPreviousData.commands[pKey] = {};
  // pPreviousData.commands[pKey] = data;
  const data = {
    test: pKey,
    results: pData,
    exit: Boolean(pData["exit"]),
    skip: Boolean(pData["skip"])
  };
  // data[ pKey ] = pData;
  // pResults.exit = pResults.exit || Boolean(pData["exit"]);
  // pResults.skip = pResults.skip || Boolean(pData["skip"]);
  if (pData.exit) pResults.status = ModStatus.EXIT;
  if (pData.skip) pResults.status = ModStatus.STOP;
  pResults.state?.tests.push(data);
  pFunc(pResults);
};

export default class TestsMod extends AbstractMod<any, any> {
  mSettings: any;
  mTemplateEngine: TemplateEngine;
  constructor(pSettings?: any) {
    super("tests", pSettings || {});
    this.mTemplateEngine = new TemplateEngine();
  }
  _evaluate(pTemplate: string, pContext: Context): string[] | null {
    return this.mTemplateEngine.evaluate(pTemplate, pContext);
  }
  /*
  pSpecs is expected to be like:
  {
    vars: {
      key1: something,
      key2: somethingelse
      ...
    },
    assertions: [
      "1 = 2",
      "1 * 2 = 10"
      ...
    ]

  }
  */
  _exec(
    pParent: string,
    pKey: string,
    pSpecs: Specs,
    _pExecutor: Executor,
    pContext: Context
  ): (data: any) => Promise<ModResult<State>> {
    return (pResults: ModResult<State>): Promise<ModResult<State>> => {
      // if ( pResults['_exit'] ) {
      //	return Promise.resolve( pResults );
      // }
      return new Promise((resolve, reject) => {
        const data: Data = {
          result: [],
          exit: false,
          pass: true,
          skip: false
        };
        try {
          // console.log(JSON.stringify(pSpecs));
          const oVars: any = {};
          if (pSpecs.vars) {
            const oVarSpecs = pSpecs.vars;
            Object.keys(pSpecs.vars).forEach(i => {
              const oKey = i;
              const oRawValues = this._evaluate(oVarSpecs[i], pContext);
              if (oRawValues && oRawValues.length > 0) {
                oVars[oKey] = oRawValues[0];
              }
            });
          }
          LOGGER.debug(
            "[%s] Running tests with following variables: %j",
            pParent,
            oVars
          );
          let func = resolve;
          if (pSpecs.assertions) {
            const oAsserts = pSpecs.assertions;
            oAsserts.every(a => {
              const expr = compileExpression(a);
              const rawResult = expr(oVars);

              const result = Boolean(rawResult);
              LOGGER.debug(
                "[%s] Test result: %s (raw result=[%s], assertion=[%s])",
                pParent,
                result,
                rawResult,
                a
              );
              data.result.push({ assertion: a, result: result });
              if (!result) {
                func = reject;
                data.exit = true;
              }
              return result;
              // TODO: kepp adding to data to get a trace of assertions that passed for example
            });
          }
          asPromised(pResults, func, pParent, pKey, data);
        } catch (e) {
          data.error = e as Error;
          asPromised(pResults, reject, pParent, pKey, data);
        }
      });
    };
  }
  handle(pParams: ModParameters): Promise<ModResult<State>> {
    return new Promise((resolve, reject) => {
      LOGGER.debug("[%s] Processing Tests...", pParams.parent);
      try {
        const oResult = {
          status: ModStatus.CONTINUE,
          state: { tests: [] }
        } as ModResult<State>;
        const oPromises: ((data: any) => Promise<any>)[] = [];
        Object.keys(pParams.config).forEach(i => {
          const oTarget = i;
          LOGGER.debug("[%s] Tests...", pParams.parent, oTarget);
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
            LOGGER.debug("[%s] Done processing tests.", pParams.parent);
            resolve(pData);
          },
          function(pError) {
            LOGGER.error("[%s] Error during tests.", pParams.parent, pError);
            reject(pError);
          }
        );
      } catch (e) {
        reject(e);
        LOGGER.error(
          "[%s] Unexpected error processing tests.",
          pParams.parent,
          e
        );
      }
    });
  }
}
