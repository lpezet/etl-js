import { createLogger } from "../../lib/logger";
import Mod from "../../lib/mod";
import { IETL } from "../../lib/etl";
import { Executor } from "../../lib/executors";
import Context from "../../lib/context";
import * as Promises from "../../lib/promises";

const LOGGER = createLogger("etljs::etl::test");

export default class CollectMod implements Mod {
  constructor(pETL: IETL) {
    if (pETL) pETL.mod("collects", this, function (_pSettings: any) {});
  }
  _do(
    pParent: string,
    pKey: string,
    pConfig: any,
    _pExecutor: Executor,
    pContext: Context
  ) {
    return function (pData: any) {
      return new Promise(function (resolve, _reject) {
        //var oResult = [];
        LOGGER.debug("[%s:%s] previous data=[%s]", pParent, pKey, pData);
        if (pData != null) {
          var d: any = { key: pKey, result: pConfig["result"] };
          //pData.collects[ pKey ] = pConfig;
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
    var that = this;
    return new Promise(function (resolve, reject) {
      LOGGER.debug("[%s] In Collect mod. Context=[%j]", pParent, pContext);
      try {
        var oResult = { exit: false, skip: false, results: [] };
        var oPromises = [];
        for (var i in pConfig) {
          oPromises.push(that._do(pParent, i, pConfig[i], pExecutor, pContext));
        }
        Promises.seq(oPromises, oResult).then(
          function (_pData) {
            LOGGER.debug(
              "[%s] Done processing commands. Data=[%j]",
              pParent,
              oResult
            );
            resolve(oResult);
          },
          function (pError) {
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
