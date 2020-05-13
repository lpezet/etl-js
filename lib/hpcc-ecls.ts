import * as path from "path";
import * as fs from "fs";
import * as Promises from "./promises";
import TemplateEngine from "./templating/engine";
import { createLogger } from "./logger";
import Mod from "./mod";
import { IETL } from "./etl";
import Context from "./context";
import { Executor } from "./executors";

const LOGGER = createLogger("etljs::hpcc-ecls");

const TEMP_ECL_FILE = "/tmp/etl-js.ecl";

export type Data = {
  error?: Error | null;
  result?: any | null;
  message?: string | null;
  exit: boolean;
  pass: boolean;
  _stdout?: string | null;
  _stderr?: string | null;
};

const asPromised = (
  pPreviousData: any,
  pKey: string,
  func: Function,
  data: any
): void => {
  if (!pPreviousData["hpcc-ecls"][pKey]) pPreviousData["hpcc-ecls"][pKey] = {};
  pPreviousData["hpcc-ecls"][pKey] = data;
  if (data["exit"]) {
    pPreviousData["_exit"] = data["exit"];
    pPreviousData["_exit_from"] = pKey;
  }
  /*
	if ( result ) {
		pPreviousData[pKey]['result'] = result;
	}
	if ( error ) {
		pPreviousData[pKey]['error'] = error;
	}
	*/
  // console.log('asPromised:');
  // console.dir( pPreviousData );
  func(pPreviousData);
};

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

export default class HPCCECLsMod implements Mod {
  mSettings: any;
  mTemplateEngine: TemplateEngine;
  constructor(pETL: IETL, pSettings?: any) {
    this.mSettings = pSettings || {};
    // const that = this;
    if (pETL) {
      pETL.mod("hpcc-ecls", this, (pSettings: any) => {
        this.mSettings = {
          ...this.mSettings,
          ...pSettings
        };
      });
    }
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
      } catch (e) {
        LOGGER.error("[%s] Error executing ecl.", pParent);
        return Promise.reject(e); // ???
      } finally {
        LOGGER.debug("[%s] Done executing ecl.", pParent);
      }
    };
  }
  _run(
    pPreviousData: any,
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
              if (pConfig[i]) {
                let oOutput: string = pConfig[i];
                if (oOutput.includes("{{")) {
                  const oOutputs = this._evaluate(oOutput, pContext);
                  if (oOutputs) oOutput = oOutputs[oTemplateIndex];
                }
                oCmdArgs.push("output=" + oOutput);
              }
              break;
            case "format":
              oCmdArgs.push("format=" + pConfig[i]);
              break;
            default:
              // TODO
              break;
          }
        });

        oCmdArgs.push("@" + TEMP_ECL_FILE);
        const oCmd = "/usr/bin/eclplus " + oCmdArgs.join(" ");

        this._prepareFile(
          pPreviousData,
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

                asPromised(pPreviousData, pKey, func, data);
              });
            } catch (e) {
              const data: Data = {
                error: e,
                exit: false,
                pass: true
              };
              LOGGER.error("[%s] Error executing ECL.", pParent, e);
              asPromised(pPreviousData, pKey, reject, data);
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
            asPromised(pPreviousData, pKey, reject, data);
          }
        );
      } catch (e) {
        LOGGER.error("[%s] Unexpected error processing step.", pParent, e);
        reject(e);
      }
    });
  }
  _prepareFile(
    _pPreviousData: any,
    pParent: string,
    _pKey: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context,
    pTemplateIndex: number
  ): Promise<any> {
    const getContent = (): Promise<any> => {
      if (pConfig["content"]) {
        return Promise.resolve(pConfig["content"]);
      }
      let oFileURI = pConfig["file"] || "";
      if (oFileURI !== "" && oFileURI.indexOf("{{") >= 0) {
        const oFileURIs = this._evaluate(oFileURI, pContext) || [];
        // TODO: check index out of bound
        oFileURI = oFileURIs[pTemplateIndex];
      }
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
        let oContent = pContent;
        if (pContent.includes("{{")) {
          const oContents = this._evaluate(oContent, pContext) || [];
          // TODO: check index out of bound
          oContent = oContents[pTemplateIndex];
        }
        return promiseExecutor(
          pExecutor,
          // eslint-disable-next-line @typescript-eslint/unbound-method
          pExecutor.writeFile,
          TEMP_ECL_FILE,
          oContent
        );
      },
      function(pError: Error) {
        return Promise.reject(pError);
      }
    );
  }
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ): Promise<any> {
    // pCurrentActivityResult, pGlobalResult, pContext ) {
    // var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
    return new Promise((resolve, reject) => {
      LOGGER.debug("[%s] Running ECL mod...", pParent);
      try {
        const oData = { "hpcc-ecls": {} };
        const oPromises: ((res: any) => Promise<any>)[] = [];

        const oResolvedConfig: any = {};
        this.mTemplateEngine.evaluateObject(pConfig, pContext, oResolvedConfig);
        // console.log('###############################################');
        // console.log( JSON.stringify( oResolvedConfig, null, 2 ) );
        // console.log('###############################################');

        Object.keys(oResolvedConfig).forEach(k => {
          const oECLConfig = this._readConfig(pParent, k, oResolvedConfig[k]);
          oPromises.push(
            this._wrapRun(pParent, k, oECLConfig, pExecutor, pContext, 0)
          );
        });

        /*
              for (var i in pConfig) {
                  var oConfig = pConfig[i];
                  var oKeys = i.indexOf("{{") < 0 ? [i]: that._evaluate( i, pContext );
                  oKeys.forEach( function( e, j ) {
                      var oECLConfig = that._read_config( pParent, e, oConfig, j );
                      oPromises.push( that._wrap_run( pParent, e, oECLConfig, pExecutor, pContext, j ) );
                  });
              }
              */

        Promises.seq(oPromises, oData).then(
          function() {
            // resolve( pData );
            resolve(oData);
          },
          function(pError) {
            LOGGER.error("[%s] Error in ECL mod.", pParent, pError);
            reject(pError);
          }
        );
      } catch (e) {
        reject(e);
        LOGGER.error("[%s] Unexpected error in ECL mod.", pParent, e);
      }
    });
  }
}
