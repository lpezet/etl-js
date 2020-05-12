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

var asPromised = function (
  pPreviousData: any,
  pKey: string,
  func: Function,
  data: any
) {
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
  //console.log('asPromised:');
  //console.dir( pPreviousData );
  func(pPreviousData);
};

var promise_executor = function (
  pExecutor: Executor,
  pFunc: Function,
  ...args: any[]
) {
  //var oArguments = arguments;
  return new Promise(function (resolve, reject) {
    //var oArgs = Array.prototype.slice.call(oArguments);
    //oArgs = oArgs.slice(2);

    var oArgs: any[] = args.concat([
      function (error: Error, stdout: string, stderr: string) {
        var data = { error: error, stdout: stdout, stderr: stderr };
        if (error) {
          reject(data);
        } else {
          resolve(data);
        }
      },
    ]);
    pFunc.apply(pExecutor, oArgs as []);
  });
};

export default class HPCCECLsMod implements Mod {
  mSettings: any;
  mTemplateEngine: TemplateEngine;
  constructor(pETL: IETL, pSettings?: any) {
    this.mSettings = pSettings || {};
    var that = this;
    if (pETL)
      pETL.mod("hpcc-ecls", this, function (pSettings: any) {
        that.mSettings = {
          ...that.mSettings,
          ...pSettings,
        };
      });
    this.mTemplateEngine = new TemplateEngine();
  }
  _evaluate(pTemplate: string, pContext: Context) {
    //TODO: Not sure I want to do this. This would make "files" handling "context" that might be different than other mods.
    //For example, "files" might accept $._current and others may not. Best if using path in template is the same across everything.
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
  _read_config(pParent: string, pKey: string, pConfig: any) {
    var oDefaults: any = {
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
      pagesize: 500,
    };

    // WARNING: defaults will be affected here, don't make it a global thing, or change logic here, by first copying defaults into empty object.
    var oConfig: any = oDefaults;
    for (var i in pConfig) {
      oConfig[i.toLowerCase()] = pConfig[i];
    }

    var apply_settings = function (pConfig: any, pSettings: any) {
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

    if (this.mSettings[pKey]) apply_settings(oConfig, this.mSettings[pKey]);
    else if (this.mSettings[pParent])
      apply_settings(oConfig, this.mSettings[pParent]);
    else if (this.mSettings["*"]) apply_settings(oConfig, this.mSettings["*"]);

    return oConfig;
  }
  _wrap_run(
    pParent: string,
    pKey: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context,
    pTemplateIndex: number
  ) {
    var that = this;
    return function (pPreviousData: any) {
      LOGGER.debug("[%s] Executing ecl...", pParent);
      try {
        return that._run(
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
        return Promise.reject(e); //???
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
    pTemplateIndex: number
  ) {
    var that = this;
    var oTemplateIndex = pTemplateIndex || 0;
    return new Promise(function (resolve, reject) {
      try {
        var oCmdArgs = [];
        oCmdArgs.push("action=query");
        for (var i in pConfig) {
          i = new String(i).toLowerCase();

          if (pConfig[i] == null) continue;
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
                var oOutput: string = pConfig[i];
                if (oOutput.indexOf("{{") >= 0) {
                  var oOutputs = that._evaluate(oOutput, pContext);
                  if (oOutputs) oOutput = oOutputs[oTemplateIndex];
                }
                oCmdArgs.push("output=" + oOutput);
              }
              break;
            case "format":
              oCmdArgs.push("format=" + pConfig[i]);
              break;
            default:
              //TODO
              break;
          }
        }

        oCmdArgs.push("@" + TEMP_ECL_FILE);
        var oCmd = "/usr/bin/eclplus " + oCmdArgs.join(" ");

        that
          ._prepareFile(
            pPreviousData,
            pParent,
            pKey,
            pConfig,
            pExecutor,
            pContext,
            pTemplateIndex
          )
          .then(
            function (_pData: any) {
              LOGGER.debug(
                "[%s] Done creating ecl file. Executing ecl...",
                pParent
              );
              try {
                pExecutor.exec(oCmd, {}, function (error, stdout, stderr) {
                  var data: Data = {
                    error: error,
                    exit: false,
                    pass: true,
                    _stdout: stdout,
                    _stderr: stderr,
                  };
                  var func = null;

                  LOGGER.debug("[%s] Done executing ECL.", pParent);
                  if (error) {
                    //reject( error );
                    func = reject;
                    data.result = data._stderr;
                  } else {
                    //resolve( stdout );
                    func = resolve;
                    data.result = data._stdout;
                  }

                  asPromised(pPreviousData, pKey, func, data);
                });
              } catch (e) {
                var data: Data = {
                  error: e,
                  exit: false,
                  pass: true,
                };
                LOGGER.error("[%s] Error executing ECL.", pParent, e);
                asPromised(pPreviousData, pKey, reject, data);
              }
            },
            function (pError: Error) {
              //console.dir( pError );
              var data: Data = {
                error: pError,
                exit: false,
                pass: true,
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
  _prepareFile = function (
    _pPreviousData: any,
    pParent: string,
    _pKey: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context,
    pTemplateIndex: number
  ) {
    var that = this;

    var getContent = function () {
      if (pConfig["content"]) {
        return Promise.resolve(pConfig["content"]);
      }
      var oFileURI = pConfig["file"] || "";
      if (oFileURI !== "") {
        if (oFileURI.indexOf("{{") >= 0) {
          var oFileURIs = that._evaluate(oFileURI, pContext);
          oFileURI = oFileURIs[pTemplateIndex];
        }
      }
      if (oFileURI.startsWith("file://")) {
        var oPath = oFileURI.substring(7); // removing "file://"
        //console.log('file path=' + oPath);
        oPath = path.resolve(process.cwd(), oPath);
        //console.log('file RESOLVED path=' + oPath);
        var oContent = fs.readFileSync(oPath, "utf8");
        return Promise.resolve(oContent);
      } else if (oFileURI !== "") {
        return promise_executor(
          pExecutor,
          pExecutor.exec,
          "wget -O " + TEMP_ECL_FILE + ' "' + oFileURI + '"',
          {}
        ).then(function (_pData: any) {
          LOGGER.debug(
            "[%s] Done downloading ecl file [%s].",
            pParent,
            pConfig["file"]
          );
          var oContent = fs.readFileSync(TEMP_ECL_FILE, "utf8");
          return Promise.resolve(oContent);
        });
      } else {
        return Promise.reject("No ECL content or file to use.");
      }
    };

    return getContent().then(
      function (pContent: string) {
        var oContent = pContent;
        if (pContent.indexOf("{{") >= 0) {
          var oContents = that._evaluate(oContent, pContext);
          oContent = oContents[pTemplateIndex];
        }
        return promise_executor(
          pExecutor,
          pExecutor.writeFile,
          TEMP_ECL_FILE,
          oContent
        );
      },
      function (pError: Error) {
        return Promise.reject(pError);
      }
    );
  };
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ) {
    //pCurrentActivityResult, pGlobalResult, pContext ) {
    //var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
    var that = this;
    return new Promise(function (resolve, reject) {
      LOGGER.debug("[%s] Running ECL mod...", pParent);
      try {
        var oData = { "hpcc-ecls": {} };
        var oPromises: ((res: any) => Promise<any>)[] = [];

        var oResolvedConfig = that.mTemplateEngine.evaluateObject(
          pConfig,
          pContext
        );
        //console.log('###############################################');
        //console.log( JSON.stringify( oResolvedConfig, null, 2 ) );
        //console.log('###############################################');

        Object.keys(oResolvedConfig).forEach((k) => {
          var oECLConfig = that._read_config(pParent, k, oResolvedConfig[k]);
          oPromises.push(
            that._wrap_run(pParent, k, oECLConfig, pExecutor, pContext, 0)
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
          function () {
            //resolve( pData );
            resolve(oData);
          },
          function (pError) {
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
