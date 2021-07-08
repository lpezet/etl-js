import * as path from "path";
import * as fs from "fs";
import * as Promises from "../promises";
import TemplateEngine from "../templating/engine";
import { createLogger } from "../logger";
import { AbstractMod, ModParameters, ModResult, ModStatus } from "../mod";
import Context from "../context";
import { Executor } from "../executors";

const LOGGER = createLogger("etljs::hpcc-ecls");

const TEMP_ECL_FILE = "/tmp/etl-js.ecl";

export type HPCCECLsState = {
  ecls: any[];
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

export type SettingsType = {
  eclplus?: string;
  [key: string]: any;
};

const asPromised = function(
  pResults: ModResult<HPCCECLsState>,
  pFunc: (results: any) => void,
  pParent: string,
  pKey: string,
  pData: Data
): void {
  LOGGER.debug("[%s] Ecls [%s] results:\n%j", pParent, pKey, pData);
  const data = {
    key: pKey,
    results: pData,
    exit: pData.exit,
    skip: pData.skip || false
  };
  if (pData.exit) pResults.status = ModStatus.EXIT;
  if (pData.skip) pResults.status = ModStatus.STOP;
  pResults.state?.ecls.push(data);
  pFunc(pResults);
};
/*
const asPromised = (
  pPreviousData: any,
  pKey: string,
  func: Function,
  pData: any
): void => {
  if (!pPreviousData["hpcc-ecls"][pKey]) pPreviousData["hpcc-ecls"][pKey] = {};
  pPreviousData["hpcc-ecls"][pKey] = pData;
  if (pData["exit"]) {
    pPreviousData["_exit"] = pData["exit"];
    pPreviousData["_exit_from"] = pKey;
  }
  func(pPreviousData);
};
*/
const promiseExecutor = (
  pExecutor: Executor,
  pFunc: Function,
  ...args: any[]
): Promise<any> => {
  // var oArguments = arguments;
  return new Promise(function(resolve, reject) {
    // var oArgs = Array.prototype.slice.call(oArguments);
    // oArgs = oArgs.slice(2);

    const oArgs: any[] = args.concat([
      function(error: Error, stdout: string, stderr: string) {
        const data = { error: error, stdout: stdout, stderr: stderr };
        if (error) {
          reject(data);
        } else {
          resolve(data);
        }
      }
    ]);
    pFunc.apply(pExecutor, oArgs as []);
  });
};

const createCommandArgsFromConfig = (pConfig: any): string[] => {
  const oCmdArgs = [];
  oCmdArgs.push("action=query");
  Object.keys(pConfig).forEach(i => {
    i = String(i).toLowerCase();

    if (pConfig[i] == null) {
      // TODO: log???
      return;
    }
    switch (i) {
      case "server":
        oCmdArgs.push("server=" + pConfig[i]);
        break;
      case "username":
        oCmdArgs.push("username=" + pConfig[i]);
        break;
      case "password":
        oCmdArgs.push("password=" + pConfig[i]);
        break;
      case "cluster":
        oCmdArgs.push("cluster=" + pConfig[i]);
        break;
      case "output":
        if (pConfig[i]) oCmdArgs.push("output=" + pConfig[i]);
        break;
      case "format":
        oCmdArgs.push("format=" + pConfig[i]);
        break;
      default:
        // TODO
        break;
    }
  });
  return oCmdArgs;
};

export default class HPCCECLsMod extends AbstractMod<any, any> {
  mTemplateEngine: TemplateEngine;
  constructor(pSettings?: SettingsType) {
    super("hpcc-ecls", pSettings || {});
    this.mSettings.eclplus = this.mSettings.eclplus || "/usr/bin/eclplus";
    this.mTemplateEngine = new TemplateEngine();
  }
  _readConfig(pParent: string, pKey: string, pConfig: any): any {
    const oDefaults: any = {
      cluster: null,
      queue: null,
      graph: null,
      timeout: null,
      ecl: null,
      file: null,
      // default | csv | csvh | xml | runecl | bin(ary)
      format: null,
      output: null,
      jobname: null,
      pagesize: 500
    };

    // WARNING: defaults will be affected here, don't make it a global thing, or change logic here, by first copying defaults into empty object.
    const oConfig: any = oDefaults;
    Object.keys(pConfig).forEach(i => {
      oConfig[i.toLowerCase()] = pConfig[i];
    });
    const applySettings = function(pConfig: any, pSettings: any): void {
      if (!pConfig["server"] && pSettings["server"]) {
        pConfig["server"] = pSettings["server"];
      }
      if (!pConfig["username"] && pSettings["username"]) {
        pConfig["username"] = pSettings["username"];
      }
      if (!pConfig["password"] && pSettings["password"]) {
        pConfig["password"] = pSettings["password"];
      }
    };

    if (this.mSettings[pKey]) applySettings(oConfig, this.mSettings[pKey]);
    else if (this.mSettings[pParent]) {
      applySettings(oConfig, this.mSettings[pParent]);
    } else if (this.mSettings["*"]) {
      applySettings(oConfig, this.mSettings["*"]);
    }

    return oConfig;
  }
  _wrapRun(
    pParent: string,
    pKey: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context,
    pTemplateIndex: number
  ): (res: any) => Promise<any> {
    return (pPreviousData: any) => {
      LOGGER.debug("[%s] Executing ecl...", pParent);
      try {
        return this._run(
          pPreviousData,
          pParent,
          pKey,
          pConfig,
          pExecutor,
          pContext,
          pTemplateIndex
        );
      } finally {
        LOGGER.debug("[%s] Done executing ecl.", pParent);
      }
    };
  }
  _run(
    pResults: ModResult<HPCCECLsState>,
    pParent: string,
    pKey: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context,
    pTemplateIndex?: number
  ): Promise<any> {
    const oTemplateIndex = pTemplateIndex || 0;
    return new Promise((resolve, reject) => {
      try {
        const oCmdArgs = createCommandArgsFromConfig(pConfig);
        oCmdArgs.push("@" + TEMP_ECL_FILE);
        const oCmd = this.mSettings.eclplus + " " + oCmdArgs.join(" ");

        this._prepareFile(
          pResults,
          pParent,
          pKey,
          pConfig,
          pExecutor,
          pContext,
          oTemplateIndex
        ).then(
          function(_pData: any) {
            LOGGER.debug(
              "[%s] Done creating ecl file. Executing ecl...",
              pParent
            );
            try {
              pExecutor.exec(oCmd, {}, function(error, stdout, stderr) {
                const data: Data = {
                  error: error,
                  exit: false,
                  pass: true,
                  _stdout: stdout,
                  _stderr: stderr
                };
                let func = null;

                LOGGER.debug("[%s] Done executing ECL.", pParent);
                if (error) {
                  // reject( error );
                  func = reject;
                  data.result = data._stderr;
                } else {
                  // resolve( stdout );
                  func = resolve;
                  data.result = data._stdout;
                }

                asPromised(pResults, func, pParent, pKey, data);
              });
            } catch (e) {
              const data: Data = {
                error: e,
                exit: false,
                pass: true
              };
              LOGGER.error("[%s] Error executing ECL.", pParent, e);
              asPromised(pResults, reject, pParent, pKey, data);
            }
          },
          function(pError: Error) {
            // console.dir( pError );
            const data: Data = {
              error: pError,
              exit: false,
              pass: true
            };
            LOGGER.error("[%s] Error preparing ECL.", pParent, pError);
            asPromised(pResults, reject, pParent, pKey, data);
          }
        );
      } catch (e) {
        LOGGER.error("[%s] Unexpected error processing step.", pParent, e);
        reject(e);
      }
    });
  }
  _prepareFile(
    _pResults: ModResult<HPCCECLsState>,
    pParent: string,
    _pKey: string,
    pConfig: any,
    pExecutor: Executor,
    _pContext: Context,
    _pTemplateIndex: number
  ): Promise<any> {
    const getContent = (): Promise<any> => {
      if (pConfig["content"]) {
        return Promise.resolve(pConfig["content"]);
      }
      const oFileURI = pConfig["file"] || "";
      if (oFileURI.startsWith("file://")) {
        let oPath = oFileURI.substring(7); // removing "file://"
        // console.log('file path=' + oPath);
        oPath = path.resolve(process.cwd(), oPath);
        // console.log('file RESOLVED path=' + oPath);
        const oContent = fs.readFileSync(oPath, "utf8");
        return Promise.resolve(oContent);
      } else if (oFileURI !== "") {
        return promiseExecutor(
          pExecutor,
          // eslint-disable-next-line @typescript-eslint/unbound-method
          pExecutor.exec,
          "wget -O " + TEMP_ECL_FILE + ' "' + oFileURI + '"',
          {}
        ).then(function(_pData: any) {
          LOGGER.debug(
            "[%s] Done downloading ecl file [%s].",
            pParent,
            pConfig["file"]
          );
          const oContent = fs.readFileSync(TEMP_ECL_FILE, "utf8");
          return Promise.resolve(oContent);
        });
      } else {
        return Promise.reject(new Error("No ECL content or file to use."));
      }
    };

    return getContent().then(
      (pContent: string) => {
        return promiseExecutor(
          pExecutor,
          // eslint-disable-next-line @typescript-eslint/unbound-method
          pExecutor.writeFile,
          TEMP_ECL_FILE,
          pContent
        );
      },
      function(pError: Error) {
        return Promise.reject(pError);
      }
    );
  }
  handle(pParams: ModParameters): Promise<ModResult<HPCCECLsState>> {
    // pCurrentActivityResult, pGlobalResult, pContext ) {
    // var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
    return new Promise((resolve, reject) => {
      LOGGER.debug("[%s] Running ECL mod...", pParams.parent);
      try {
        const oResult: ModResult<HPCCECLsState> = {
          exit: false,
          skip: false,
          status: ModStatus.CONTINUE,
          state: { ecls: [] }
        };
        const oPromises: ((res: any) => Promise<any>)[] = [];

        const oResolvedConfig: any = {};
        this.mTemplateEngine.evaluateObject(
          pParams.config,
          pParams.context,
          oResolvedConfig
        );
        // console.log('###############################################');
        // console.log( JSON.stringify( oResolvedConfig, null, 2 ) );
        // console.log('###############################################');
        Object.keys(oResolvedConfig).forEach(k => {
          const oECLConfig = this._readConfig(
            pParams.parent,
            k,
            oResolvedConfig[k]
          );
          oPromises.push(
            this._wrapRun(
              pParams.parent,
              k,
              oECLConfig,
              pParams.executor,
              pParams.context,
              0
            )
          );
        });
        Promises.seq(oPromises, oResult).then(
          function(pData) {
            resolve(pData);
          },
          function(pError) {
            LOGGER.error("[%s] Error in ECL mod.", pParams.parent, pError);
            reject(pError);
          }
        );
      } catch (e) {
        reject(e);
        LOGGER.error("[%s] Unexpected error in ECL mod.", pParams.parent, e);
      }
    });
  }
}
