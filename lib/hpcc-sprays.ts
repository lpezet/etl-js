import * as Promises from "./promises";
import { IETL } from "./etl";
import Mod from "./mod";
import TemplateEngine from "./templating/engine";
import { createLogger } from "./logger";
import { Executor } from "./executors";
import Context from "./context";

const LOGGER = createLogger("etljs::hpcc-desprays");

var re_escape = function (pValue: string) {
  if (pValue.indexOf("\\") < 0) return pValue;
  return pValue.replace("/\\/g", "\\\\");
};

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
  if (!pPreviousData["hpcc-sprays"][pKey])
    pPreviousData["hpcc-sprays"][pKey] = {};
  pPreviousData["hpcc-sprays"][pKey] = data;
  if (data["exit"]) {
    pPreviousData["_exit"] = data["exit"];
    pPreviousData["_exit_from"] = pKey;
  }
  func(pPreviousData);
};

export default class HPCCSpraysMod implements Mod {
  mSettings: any;
  mTemplateEngine: TemplateEngine;
  constructor(pETL: IETL, pSettings?: any) {
    this.mSettings = pSettings || {};
    var that = this;
    if (pETL)
      pETL.mod("hpcc-sprays", this, function (pSettings: any) {
        that.mSettings = {
          ...that.mSettings,
          ...pSettings,
        };
      });
    this.mTemplateEngine = new TemplateEngine();
  }
  _evaluate = function (pTemplate: string, pContext: Context) {
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
  };
  _spray_error(pParent: string, pKey: string) {
    return function (_pPreviousData: any) {
      var data = {
        error:
          "Must specify spray format (fixed|csv|delimited|xml|recfmv|recfmb) for file [" +
          pKey +
          "].",
        result: null,
        message: null,
        exit: false,
        pass: true,
        _stdout: null,
        _stderr: null,
      };
      LOGGER.error(
        "[%s] Must specify spray format (fixed|csv|delimited|xml|recfmv|recfmb) for file [%s].",
        pParent,
        pKey
      );
      return Promise.reject(data);
    };
  }
  _spray_fixed = function (
    pParent: string,
    _pKey: string,
    _pSprayConfig: any,
    _pExecutor: Executor,
    _pContext: Context,
    _pTemplateIndex: number
  ) {
    return function () {
      return new Promise(function (_resolve, reject) {
        var data = {
          error: "Spray fixed is not yet supported.",
          result: null,
          message: null,
          exit: false,
          pass: true,
          _stdout: null,
          _stderr: null,
        };
        LOGGER.error("[%s] Spray fixed is not yet supported.", pParent);
        reject(data);
      });
    };
  };
  _spray_xml = function (
    pParent: string,
    _pKey: string,
    _pSprayConfig: any,
    _pExecutor: Executor,
    _pContext: Context,
    _pTemplateIndex: number
  ) {
    return function (_pPreviousData: any) {
      return new Promise(function (_resolve, reject) {
        var data = {
          error: "Spray fixed is not yet supported.",
          result: null,
          message: null,
          exit: false,
          pass: true,
          _stdout: null,
          _stderr: null,
        };
        LOGGER.error("[%s] Spray xml is not yet supported.", pParent);
        reject(data);
      });
    };
  };
  _spray_delimited(
    pParent: string,
    pKey: string,
    pSprayConfig: any,
    pExecutor: Executor,
    pContext: Context,
    pTemplateIndex: number
  ) {
    LOGGER.debug(
      "[%s] Spraying delimited to [%s]...",
      pParent,
      pSprayConfig ? pSprayConfig.destinationlogicalname : "NA"
    );
    var that = this;
    return function (pPreviousData: any) {
      return new Promise(function (resolve, reject) {
        try {
          var safe_parse_int = function (
            pValue: string,
            pDefault: number
          ): number {
            try {
              return parseInt(pValue);
            } catch (e) {
              return pDefault;
            }
          };

          var zero_one = function (pValue: any): string {
            if (pValue === true || pValue === "1") return "1";
            return "0";
          };
          var oCmdArgs = [];
          oCmdArgs.push("action=spray");

          const DEFAULT_ATTRS: any = {
            //, , , "espserveripport": true,
            sourceip: true,
            destinationgroup: true,
            destinationlogicalname: true,
            sourcepath: true,
            format: true,
            server: true,
            username: true,
            password: true,
            maxconnections: true,
            timeout: true,
            allowoverwrite: true,
            replicate: true,
            compress: true,
            failifnosourcefile: true,
            expiredays: true,
          };

          const CSV_ATTRS: any = {
            quotedterminator: true,
            recordstructurepresent: true,
            encoding: true,
            srccsvseparator: true,
            srccsvterminator: true,
            srccsvquote: true,
            sourcecsvescape: true,
            maxrecordsize: true,
          };
          for (var k in pSprayConfig) {
            k = new String(k).toLowerCase();

            if (!DEFAULT_ATTRS[k] && !CSV_ATTRS[k]) continue;
            //if ( ! pSprayConfig[k] ) continue; //TODO: sure?

            switch (k) {
              //case "espserveripport": // this is from ECL SprayDelimited documentation, not from dfuplus...
              case "server":
                oCmdArgs.push("server=" + pSprayConfig[k]);
                break;
              case "username":
                oCmdArgs.push("username=" + pSprayConfig[k]);
                break;
              case "password":
                oCmdArgs.push("password=" + pSprayConfig[k]);
                break;
              case "sourceip":
                oCmdArgs.push("srcip=" + pSprayConfig[k]);
                break;
              case "sourcepath":
                if (pSprayConfig[k]) {
                  var oSrcPath = pSprayConfig[k];
                  //console.log('srcPath=' + oSrcPath);
                  if (oSrcPath.indexOf("{{") >= 0) {
                    var oSrcPaths = that._evaluate(oSrcPath, pContext);
                    oSrcPath = oSrcPaths[pTemplateIndex];
                  }
                  oCmdArgs.push("srcfile=" + oSrcPath);
                }
                break;
              case "format":
                oCmdArgs.push("format=" + pSprayConfig[k]);
                break;
              case "maxconnections":
                oCmdArgs.push("connect=" + pSprayConfig[k]);
                break;
              case "timeout":
                var oTimeoutValue = safe_parse_int(pSprayConfig[k], -999);
                if (oTimeoutValue === 0) oCmdArgs.push("nowait=1");
                else oCmdArgs.push("nowait=0");
                break;
              case "destinationlogicalname":
                oCmdArgs.push("dstname=" + pSprayConfig[k]);
                break;
              case "destinationgroup":
                oCmdArgs.push("dstcluster=" + pSprayConfig[k]);
                break;
              case "allowoverwrite":
                oCmdArgs.push("overwrite=" + zero_one(pSprayConfig[k]));
                break;
              case "replicate":
                oCmdArgs.push("replicate=" + zero_one(pSprayConfig[k]));
                break;
              case "compress":
                oCmdArgs.push("compress=" + zero_one(pSprayConfig[k]));
                break;
              case "failifnosourcefile":
                oCmdArgs.push(
                  "failifnosourcefile=" + zero_one(pSprayConfig[k])
                );
                break;
              case "expiredays":
                oCmdArgs.push("expiredays=" + pSprayConfig[k]);
                break;
              case "quotedterminator":
                oCmdArgs.push("quotedTerminator=" + zero_one(pSprayConfig[k]));
                break;
              case "recordstructurepresent":
                oCmdArgs.push(
                  "recordstructurepresent=" + zero_one(pSprayConfig[k])
                );
                break;
              case "encoding":
                oCmdArgs.push("encoding=" + pSprayConfig[k]);
                break;
              case "srccsvseparator":
                oCmdArgs.push("srccsvseparator=" + re_escape(pSprayConfig[k]));
                break;
              case "srccsvterminator":
                oCmdArgs.push("srccsvterminator=" + re_escape(pSprayConfig[k]));
                break;
              case "srccsvquote":
                oCmdArgs.push("quote=\\" + pSprayConfig[k]); //TODO: is that right to escape here?
                break;
              case "maxrecordsize":
                oCmdArgs.push("maxrecordsize=" + pSprayConfig[k]);
                break;
              case "sourcecsvescape":
                oCmdArgs.push("escape=" + pSprayConfig[k]);
                break;
              default:
                LOGGER.warn(
                  "[%s] Skipping property [%s]. Not supported for delimited.",
                  pParent,
                  k
                );
                break;
            }
          }
          var oCmdOptions = {};

          var oCmd = "/usr/bin/dfuplus " + oCmdArgs.join(" ");
          pExecutor.exec(oCmd, oCmdOptions, function (error, stdout, stderr) {
            var data: Data = {
              error: error,
              exit: false,
              pass: true,
              _stdout: stdout,
              _stderr: stderr,
            };
            var func = null;

            if (error) {
              LOGGER.error(
                "[%s] Error while executing spraying command.",
                pParent,
                error
              );
              //reject( error );
              func = reject;
              data.result = data._stderr;
            } else {
              //resolve();
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
          LOGGER.error("[%s] Unexpected error spraying delimited", e);
          asPromised(pPreviousData, pKey, reject, data);
        }
      });
    };
  }
  _read_config(pParent: string, pKey: string, pConfig: any) {
    var oDefaults: any = {
      format: null,
      //sourceip: null,
      sourcepath: null,
      maxrecordsize: 8192,
      srccsvseparator: "\\,",
      srccsvterminator: "\\n,\\r\\n",
      srccsvquote: '"',
      destinationgroup: null,
      destinationlogicalname: null,
      timeout: -1,
      //espserveripport: null,
      maxconnections: 25,
      allowoverwrite: "0",
      replicate: "1",
      compress: "0",
      sourcecsvescape: null,
      failifnosourcefile: "1",
      recordstructurepresent: "0",
      quotedterminator: "1",
      //encoding: "utf8",//TODO: seems to overide "format"!
      expiredays: "",
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
      LOGGER.debug("[%s] Processing spray...", pParent);
      try {
        var oData = { "hpcc-sprays": {} };
        var oPromises: ((res: any) => Promise<any>)[] = [];

        for (var i in pConfig) {
          var oLogicalFileName = i;
          var oLogicalFileNames =
            oLogicalFileName.indexOf("{{") < 0
              ? [oLogicalFileName]
              : that._evaluate(oLogicalFileName, pContext);
          oLogicalFileNames.forEach(function (e: string, j: number) {
            var oSprayConfig = that._read_config(pParent, i, pConfig[i]);
            if (!oSprayConfig.destinationlogicalname)
              oSprayConfig.destinationlogicalname = e;

            if (!oSprayConfig.format) {
              oPromises.push(that._spray_error(pParent, e));
            } else {
              switch (oSprayConfig.format) {
                case "delimited":
                case "csv":
                  oPromises.push(
                    that._spray_delimited(
                      pParent,
                      e,
                      oSprayConfig,
                      pExecutor,
                      pContext,
                      j
                    )
                  );
                  break;
                case "fixed":
                  oPromises.push(
                    that._spray_fixed(
                      pParent,
                      e,
                      oSprayConfig,
                      pExecutor,
                      pContext,
                      j
                    )
                  );
                  break;
                case "xml":
                  oPromises.push(
                    that._spray_xml(
                      pParent,
                      e,
                      oSprayConfig,
                      pExecutor,
                      pContext,
                      j
                    )
                  );
                  break;
                default:
                  LOGGER.error(
                    "[%s] Spray format [%s] not supported.",
                    pParent,
                    oSprayConfig.format
                  );
                  break;
              }
            }
          });
        }
        Promises.seq(oPromises, oData).then(
          function (_pData) {
            LOGGER.debug("[%s] Done processing spray.", pParent);
            resolve(oData);
          },
          function (pError) {
            LOGGER.error("[%s] Unexpected error spraying.", pParent, pError);
            reject(pError);
          }
        );
      } catch (e) {
        LOGGER.error("[%s] Unexpected error processing step.", pParent, e);
        reject(e);
      }
    });
  }
}
