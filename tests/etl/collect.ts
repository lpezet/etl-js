import { createLogger } from "../../lib/logger";
import { AbstractMod } from "../../lib/mod";
import { Executor } from "../../lib/executors";
import Context from "../../lib/context";
import * as Promises from "../../lib/promises";

const LOGGER = createLogger("etljs::etl::test");

export default class CollectMod extends AbstractMod<any> {
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
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      LOGGER.debug("[%s] In Collect mod. Context=[%j]", pParent, pContext);
      try {
        const oResult = { exit: false, skip: false, results: [] };
        const oPromises: ((data: any) => Promise<any>)[] = [];
        Object.keys(pConfig).forEach(i => {
          oPromises.push(this._do(pParent, i, pConfig[i], pExecutor, pContext));
        });
        Promises.seq(oPromises, oResult).then(
          function(_pData) {
            LOGGER.debug(
              "[%s] Done processing commands. Data=[%j]",
              pParent,
              oResult
            );
            resolve(oResult);
          },
          function(pError) {
            LOGGER.error(
              "[%s] Unexpected error running commands.",
              pParent,
              pError
            );
            reject(pError);
          }
        );
      } catch (e) {
        LOGGER.error("[%s] Unexpected error processing commands.", pParent, e);
        reject(e);
      }
    });
  }
}
