import { createLogger } from "../../lib/logger";
import {
  AbstractMod,
  ModParameters,
  ModResult,
  ModStatus,
  createModResult
} from "../../lib/mod";
import { Executor } from "../../lib/executors";
import Context from "../../lib/context";
import * as Promises from "../../lib/promises";

const LOGGER = createLogger("etljs::etl::test");

export default class CollectMod extends AbstractMod<any, any> {
  constructor() {
    super("collects", {});
  }
  _do(
    pParent: string,
    pKey: string,
    pConfig: any,
    _pExecutor: Executor,
    pContext: Context
  ) {
    return function(pData: any) {
      return new Promise(function(resolve, _reject) {
        // var oResult = [];
        LOGGER.debug("[%s:%s] previous data=[%s]", pParent, pKey, pData);
        if (pData != null) {
          const d: any = { key: pKey, result: pConfig["result"] };
          // pData.collects[ pKey ] = pConfig;
          pData["state"] = pData["state"] || {};
          pData.state["results"] = pData.state["results"] || [];
          pData.state.results.push(d);
          if (pConfig["var"]) {
            d["var"] = pConfig["var"];
            pContext.vars[pConfig["var"]] = pConfig["result"];
          }
        }
        resolve(pData);
      });
    };
  }
  handle({
    config,
    executor,
    context,
    parent
  }: ModParameters): Promise<ModResult<any>> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
      const { env, ...contextRest } = context;
      LOGGER.debug("[%s] In Collect mod. Context=[%j]", parent, contextRest);
      try {
        const oResult = createModResult(ModStatus.CONTINUE);
        const oPromises: ((data: any) => Promise<any>)[] = [];
        Object.keys(config).forEach(i => {
          oPromises.push(this._do(parent, i, config[i], executor, context));
        });
        Promises.seq(oPromises, oResult).then(
          function(_pData) {
            LOGGER.debug(
              "[%s] Done processing commands. Data=[%j]",
              parent,
              oResult
            );
            resolve(oResult);
          },
          function(pError) {
            LOGGER.error(
              "[%s] Unexpected error running commands.",
              parent,
              pError
            );
            reject(pError);
          }
        );
      } catch (e) {
        LOGGER.error("[%s] Unexpected error processing commands.", parent, e);
        reject(e);
      }
    });
  }
}
