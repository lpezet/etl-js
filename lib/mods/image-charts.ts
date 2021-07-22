import * as Promises from "../promises";
import TemplateEngine from "../templating/engine";
import { Logger, createLogger } from "../logger";
import { AbstractMod, ModParameters, ModResult, ModStatus } from "../mod";
import Context from "../context";
import { Executor } from "../executors";

const LOGGER: Logger = createLogger("etljs::image-charts");

export type ImageChartsState = {
  charts: any[];
};

export type Data = {
  error?: Error | null;
  result?: any | null;
  message?: string | null;
  exit: boolean;
  pass: boolean;
  skip?: boolean;
  _stdout?: string | null;
  _stderr?: string | null;
};

const asPromised = function(
  pResults: ModResult<ImageChartsState>,
  pFunc: (results: any) => void,
  pParent: string,
  pKey: string,
  pData: Data
): void {
  LOGGER.debug("[%s] Image Charts [%s] results:\n%j", pParent, pKey, pData);
  const data = {
    key: pKey,
    results: pData,
    exit: pData.exit,
    skip: pData.skip || false
  };
  pResults.state?.charts.push(data);
  pFunc(pResults);
};

const createImageChartsUrl = function(pArgs: string[]): string {
  const oArgs = pArgs.join("&");
  return "https://image-charts.com/chart?" + oArgs;
};

const getDataFileContent = function(
  pParent: string,
  pKey: string,
  pDataFile: string,
  pCmdOptions: any,
  pExecutor: Executor
): Promise<Data> {
  return new Promise(function(resolve, reject) {
    LOGGER.debug("[%s] Getting data file content...", pParent);
    pExecutor.exec("cat " + pDataFile, pCmdOptions, function(
      error,
      stdout,
      stderr
    ) {
      const data: Data = {
        error: error,
        exit: false,
        pass: error == null,
        skip: false,
        _stdout: stdout,
        _stderr: stderr
      };
      if (error) {
        reject(data);
      } else {
        LOGGER.debug(
          "[%s] Done getting data file content for [%s].",
          pParent,
          pKey
        );
        resolve(data);
      }
    });
  });
};

export default class ImageChartsMod extends AbstractMod<any, any> {
  mTemplateEngine: TemplateEngine;
  constructor(pSettings?: any) {
    super("image-charts", pSettings || {});
    this.mTemplateEngine = new TemplateEngine();
  }
  _evaluate(pTemplate: string, pContext: Context): string[] | null {
    // TODO: Not sure I want to do this. This would make "files" handling "context" that might be different than other mods.
    // For example, "files" might accept $._current and others may not. Best if using path in template is the same across everything.
    // Having said that, a mod then cannot access the results of another mod within the same activity...

    /*
      var oContext = JSON.parse(JSON.stringify(pContext.global));
      oContext['_current'] = JSON.parse(JSON.stringify(pContext.local));
      console.log('Merged context=');
      console.dir( oContext );
      var oResult = this.mTemplateEngine.evaluate( pTemplate, oContext );
      console.log('Result=');
      console.dir( oResult );
      */
    return this.mTemplateEngine.evaluate(pTemplate, pContext);
  }
  _exec(
    pParent: string,
    pKey: string,
    pSpecs: any,
    pExecutor: Executor,
    pContext: Context
  ): (
    data: ModResult<ImageChartsState>
  ) => Promise<ModResult<ImageChartsState>> {
    return (pResults: ModResult<ImageChartsState>) => {
      return new Promise((resolve, reject) => {
        try {
          LOGGER.debug("[%s] Creating image-charts [%s]...", pParent, pKey);
          const oChartArgs: string[] = [];
          Object.keys(pSpecs).forEach(i => {
            switch (i) {
              case "chs":
                oChartArgs.push("chs=" + pSpecs[i]);
                break;
              case "cht":
                oChartArgs.push("cht=" + pSpecs[i]);
                break;
              case "chtt": {
                let oTitle = pSpecs[i];
                if (oTitle) {
                  if (oTitle.indexOf("{{") >= 0) {
                    const v = this._evaluate(oTitle, pContext);
                    if (v) oTitle = v[0];
                  }
                  oChartArgs.push("chtt=" + oTitle);
                }
                break;
              }
              case "chxt":
                oChartArgs.push("chxt=" + pSpecs[i]);
                break;
              case "chxs":
                oChartArgs.push("chxs=" + pSpecs[i]);
                break;
              default:
                // TODO
                break;
            }
          });
          let oChartDataFile = pSpecs["data"];
          if (oChartDataFile.indexOf("{{") >= 0) {
            const v = this._evaluate(oChartDataFile, pContext);
            if (v && v.length >= 1) oChartDataFile = v[0];
            // TODO: else, log???
          }
          const oCmdOptions: any = {};
          oCmdOptions["context"] = pKey;

          getDataFileContent(
            pParent,
            pKey,
            oChartDataFile,
            oCmdOptions,
            pExecutor
          ).then(
            function(pData: Data) {
              const data: Data = {
                ...pData,
                exit: false,
                pass: true
              };
              let func = resolve;
              if (data.error) {
                func = reject;
              } else {
                const oArgs = data._stdout?.split(/\r?\n/);
                if (oArgs && oArgs.length >= 3) {
                  oChartArgs.push("chxl=0:|" + oArgs[0]);
                  oChartArgs.push("chdl=" + oArgs[1]);
                  oChartArgs.push("chd=a:" + oArgs[2]);
                  const url = createImageChartsUrl(oChartArgs);
                  LOGGER.info("[%s] Url for [%s]:\n%s", pParent, pKey, url);

                  data.result = url;
                  // oResult.push( url );
                } else {
                  func = reject;
                  data.error = new Error("Invalid data for image-charts.");
                  LOGGER.error(
                    "[%s] Could not parse output: [%s]. Could not create chart url from it.",
                    pParent,
                    data
                  );
                }
              }
              asPromised(pResults, func, pParent, pKey, data);
              // resolve( oResult );
            },
            function(error) {
              // console.log( error );
              // reject( error );
              asPromised(pResults, reject, pParent, pKey, {
                error: error,
                result: null,
                exit: false,
                pass: false
              });
            }
          );
        } catch (e) {
          LOGGER.error(
            "[%s] Unexpected error creating image-chart [%s].",
            pParent,
            pKey
          );
          reject(e);
        }
      });
    };
  }
  handle(pParams: ModParameters): Promise<ModResult<ImageChartsState>> {
    // pCurrentActivityResult, pGlobalResult, pContext ) {
    // var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
    return new Promise((resolve, reject) => {
      LOGGER.debug("[%s] Processing image-charts...", pParams.parent);
      try {
        // eslint-disable-next-line @typescript-eslint/camelcase
        const oResult: ModResult<ImageChartsState> = {
          exit: false,
          skip: false,
          status: ModStatus.CONTINUE,
          state: { charts: [] }
        };
        const oPromises: ((data: any) => Promise<any>)[] = [];
        Object.keys(pParams.config).forEach(i => {
          let oKey = i;
          if (oKey.includes("{{")) {
            const v = this._evaluate(oKey, pParams.context);
            if (v) oKey = v[0];
          }
          oPromises.push(
            this._exec(
              pParams.parent,
              oKey,
              pParams.config[i],
              pParams.executor,
              pParams.context
            )
          );
        });
        Promises.seq(oPromises, oResult).then(
          function(pData) {
            LOGGER.debug("[%s] Done processing image-charts.", pParams.parent);
            resolve(pData);
          },
          function(pError) {
            LOGGER.error(
              "[%s] Unexpected error running image-charts.",
              pParams.parent,
              pError
            );
            reject(pError);
          }
        );
      } catch (e) {
        LOGGER.error(
          "[%s] Unexpected error processing image-charts.",
          pParams.parent,
          e
        );
        reject(e);
      }
    });
  }
}
