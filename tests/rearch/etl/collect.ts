import { createLogger } from "../../../lib/rearch/logger";
import { AbstractMod, createModResult, ModParameters, ModResult, ModStatus } from "../../../lib/rearch/mod";
import { Executor } from "../../../lib/rearch/executors";
import Context from "../../../lib/rearch/context";
import * as Promises from "../../../lib/rearch/promises";

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
          pData.results.push(d);
          if (pConfig["var"]) {
            d["var"] = pConfig["var"];
            pContext.vars[pConfig["var"]] = pConfig["result"];
          }
        }
        resolve(pData);
      });
    };
  }
  handle({ config, executor, context, parent }: ModParameters): Promise<ModResult<any>> {
    return new Promise((resolve, reject) => {
      LOGGER.debug("[%s] In Collect mod. Context=[%j]", parent, context);
      try {
        const oResult = createModResult(ModStatus.DONE);
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
