import * as Promises from "../promises";
import { AbstractMod, ModParameters, ModResult, ModStatus } from "../mod";
import TemplateEngine from "../templating/engine";
import { Logger, createLogger } from "../logger";
import { Executor } from "../executors";
import Context from "../context";

const LOGGER: Logger = createLogger("etljs::hpcc-desprays");

export type HPCCSpraysState = {
  sprays: any[];
};

const reEscape = function(pValue: string): string {
  if (!pValue.includes("\\")) return pValue;
  return pValue.replace("/\\/g", "\\\\");
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
  pResults: ModResult<HPCCSpraysState>,
  pFunc: (results: any) => void,
  pParent: string,
  pKey: string,
  pData: Data
): void {
  LOGGER.debug("[%s] Sprays [%s] results:\n%j", pParent, pKey, pData);
  const data = {
    key: pKey,
    results: pData,
    exit: pData.exit,
    skip: pData.skip || false
  };
  if (pData.exit) pResults.status = ModStatus.EXIT;
  if (pData.skip) pResults.status = ModStatus.STOP;
  pResults.state?.sprays.push(data);
  pFunc(pResults);
};
/*
const asPromised = function(
  pPreviousData: any,
  pKey: string,
  func: Function,
  data: any
): void {
  if (!pPreviousData["hpcc-sprays"][pKey]) {
    pPreviousData["hpcc-sprays"][pKey] = {};
  }
  pPreviousData["hpcc-sprays"][pKey] = data;
  if (data["exit"]) {
    pPreviousData["_exit"] = data["exit"];
    pPreviousData["_exit_from"] = pKey;
  }
  func(pPreviousData);
};
*/

export default class HPCCSpraysMod extends AbstractMod<any, any> {
  mTemplateEngine: TemplateEngine;
  constructor(pSettings?: any) {
    super("hpcc-sprays", pSettings || {});
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
  _sprayError(pParent: string, pKey: string): (data: any) => Promise<any> {
    return function(_pPreviousData: any) {
      const data = {
        error:
          "Must specify spray format (fixed|csv|delimited|xml|recfmv|recfmb) for file [" +
          pKey +
          "].",
        result: null,
        message: null,
        exit: false,
        pass: true,
        _stdout: null,
        _stderr: null
      };
      LOGGER.error(
        "[%s] Must specify spray format (fixed|csv|delimited|xml|recfmv|recfmb) for file [%s].",
        pParent,
        pKey
      );
      return Promise.reject(data);
    };
  }
  _sprayFixed = function(
    pParent: string,
    _pKey: string,
    _pSprayConfig: any,
    _pExecutor: Executor,
    _pContext: Context,
    _pTemplateIndex: number
  ): () => Promise<any> {
    return function() {
      return new Promise(function(_resolve, reject) {
        const data = {
          error: "Spray fixed is not yet supported.",
          result: null,
          message: null,
          exit: false,
          pass: true,
          _stdout: null,
          _stderr: null
        };
        LOGGER.error("[%s] Spray fixed is not yet supported.", pParent);
        reject(data);
      });
    };
  };
  _sprayXml(
    pParent: string,
    _pKey: string,
    _pSprayConfig: any,
    _pExecutor: Executor,
    _pContext: Context,
    _pTemplateIndex: number
  ): (data: any) => Promise<any> {
    return function(_pPreviousData: any) {
      return new Promise(function(_resolve, reject) {
        const data = {
          error: "Spray fixed is not yet supported.",
          result: null,
          message: null,
          exit: false,
          pass: true,
          _stdout: null,
          _stderr: null
        };
        LOGGER.error("[%s] Spray xml is not yet supported.", pParent);
        reject(data);
      });
    };
  }
  _sprayDelimited(
    pParent: string,
    pKey: string,
    pSprayConfig: any,
    pExecutor: Executor,
    pContext: Context,
    pTemplateIndex: number
  ): (data: ModResult<HPCCSpraysState>) => Promise<ModResult<HPCCSpraysState>> {
    LOGGER.debug(
      "[%s] Spraying delimited to [%s]...",
      pParent,
      pSprayConfig ? pSprayConfig.destinationlogicalname : "NA"
    );
    return (pResults: ModResult<HPCCSpraysState>) => {
      return new Promise((resolve, reject) => {
        try {
          const safeParseInt = function(
            pValue: string,
            pDefault: number
          ): number {
            try {
              return parseInt(pValue);
            } catch (e) {
              return pDefault;
            }
          };

          const zeroOne = function(pValue: any): string {
            if (pValue === true || pValue === "1") return "1";
            return "0";
          };
          const oCmdArgs = [];
          oCmdArgs.push("action=spray");

          const DEFAULT_ATTRS: any = {
            // , , , "espserveripport": true,
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
            expiredays: true
          };

          const CSV_ATTRS: any = {
            quotedterminator: true,
            recordstructurepresent: true,
            encoding: true,
            srccsvseparator: true,
            srccsvterminator: true,
            srccsvquote: true,
            sourcecsvescape: true,
            maxrecordsize: true
          };
          Object.keys(pSprayConfig).forEach(k => {
            k = String(k).toLowerCase();

            if (!DEFAULT_ATTRS[k] && !CSV_ATTRS[k]) return; // TODO: log???
            // if ( ! pSprayConfig[k] ) continue; //TODO: sure?

            switch (k) {
              // case "espserveripport": // this is from ECL SprayDelimited documentation, not from dfuplus...
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
                  let oSrcPath = pSprayConfig[k];
                  // console.log('srcPath=' + oSrcPath);
                  if (oSrcPath.indexOf("{{") >= 0) {
                    const oSrcPaths = this._evaluate(oSrcPath, pContext);
                    if (oSrcPaths && oSrcPaths.length > pTemplateIndex) {
                      oSrcPath = oSrcPaths[pTemplateIndex];
                    } // TODO: else, log????
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
              case "timeout": {
                const oTimeoutValue = safeParseInt(pSprayConfig[k], -999);
                if (oTimeoutValue === 0) oCmdArgs.push("nowait=1");
                else oCmdArgs.push("nowait=0");
                break;
              }
              case "destinationlogicalname":
                oCmdArgs.push("dstname=" + pSprayConfig[k]);
                break;
              case "destinationgroup":
                oCmdArgs.push("dstcluster=" + pSprayConfig[k]);
                break;
              case "allowoverwrite":
                oCmdArgs.push("overwrite=" + zeroOne(pSprayConfig[k]));
                break;
              case "replicate":
                oCmdArgs.push("replicate=" + zeroOne(pSprayConfig[k]));
                break;
              case "compress":
                oCmdArgs.push("compress=" + zeroOne(pSprayConfig[k]));
                break;
              case "failifnosourcefile":
                oCmdArgs.push("failifnosourcefile=" + zeroOne(pSprayConfig[k]));
                break;
              case "expiredays":
                oCmdArgs.push("expiredays=" + pSprayConfig[k]);
                break;
              case "quotedterminator":
                oCmdArgs.push("quotedTerminator=" + zeroOne(pSprayConfig[k]));
                break;
              case "recordstructurepresent":
                oCmdArgs.push(
                  "recordstructurepresent=" + zeroOne(pSprayConfig[k])
                );
                break;
              case "encoding":
                oCmdArgs.push("encoding=" + pSprayConfig[k]);
                break;
              case "srccsvseparator":
                oCmdArgs.push("srccsvseparator=" + reEscape(pSprayConfig[k]));
                break;
              case "srccsvterminator":
                oCmdArgs.push("srccsvterminator=" + reEscape(pSprayConfig[k]));
                break;
              case "srccsvquote":
                oCmdArgs.push("quote=\\" + pSprayConfig[k]); // TODO: is that right to escape here?
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
          });
          const oCmdOptions = {};

          const oCmd = "/usr/bin/dfuplus " + oCmdArgs.join(" ");
          pExecutor.exec(oCmd, oCmdOptions, function(error, stdout, stderr) {
            const data: Data = {
              error: error,
              exit: false,
              pass: true,
              _stdout: stdout,
              _stderr: stderr
            };
            let func = null;

            if (error) {
              LOGGER.error(
                "[%s] Error while executing spraying command.",
                pParent,
                error
              );
              // reject( error );
              func = reject;
              data.result = data._stderr;
            } else {
              // resolve();
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
          LOGGER.error("[%s] Unexpected error spraying delimited", e);
          asPromised(pResults, reject, pParent, pKey, data);
        }
      });
    };
  }
  _readConfig(pParent: string, pKey: string, pConfig: any): any {
    const oDefaults: any = {
      format: null,
      // sourceip: null,
      sourcepath: null,
      maxrecordsize: 8192,
      srccsvseparator: "\\,",
      srccsvterminator: "\\n,\\r\\n",
      srccsvquote: '"',
      destinationgroup: null,
      destinationlogicalname: null,
      timeout: -1,
      // espserveripport: null,
      maxconnections: 25,
      allowoverwrite: "0",
      replicate: "1",
      compress: "0",
      sourcecsvescape: null,
      failifnosourcefile: "1",
      recordstructurepresent: "0",
      quotedterminator: "1",
      // encoding: "utf8",//TODO: seems to overide "format"!
      expiredays: ""
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
  handle(pParams: ModParameters): Promise<ModResult<HPCCSpraysState>> {
    // pCurrentActivityResult, pGlobalResult, pContext ) {
    // var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
    return new Promise((resolve, reject) => {
      LOGGER.debug("[%s] Processing spray...", pParams.parent);
      try {
        const oResult: ModResult<HPCCSpraysState> = {
          exit: false,
          skip: false,
          status: ModStatus.CONTINUE,
          state: { sprays: [] }
        };
        const oPromises: ((res: any) => Promise<any>)[] = [];
        Object.keys(pParams.config).forEach(i => {
          const oLogicalFileName = i;
          let oLogicalFileNames = [oLogicalFileName];
          if (oLogicalFileName.includes("{{")) {
            const v = this._evaluate(oLogicalFileName, pParams.context);
            if (v && v.length >= 1) oLogicalFileNames = v;
          }
          oLogicalFileNames.forEach((e: string, j: number) => {
            const oSprayConfig = this._readConfig(
              pParams.parent,
              i,
              pParams.config[i]
            );
            if (!oSprayConfig.destinationlogicalname) {
              oSprayConfig.destinationlogicalname = e;
            }

            if (!oSprayConfig.format) {
              oPromises.push(this._sprayError(pParams.parent, e));
            } else {
              switch (oSprayConfig.format) {
                case "delimited":
                case "csv":
                  oPromises.push(
                    this._sprayDelimited(
                      pParams.parent,
                      e,
                      oSprayConfig,
                      pParams.executor,
                      pParams.context,
                      j
                    )
                  );
                  break;
                case "fixed":
                  oPromises.push(
                    this._sprayFixed(
                      pParams.parent,
                      e,
                      oSprayConfig,
                      pParams.executor,
                      pParams.context,
                      j
                    )
                  );
                  break;
                case "xml":
                  oPromises.push(
                    this._sprayXml(
                      pParams.parent,
                      e,
                      oSprayConfig,
                      pParams.executor,
                      pParams.context,
                      j
                    )
                  );
                  break;
                default:
                  LOGGER.error(
                    "[%s] Spray format [%s] not supported.",
                    pParams.parent,
                    oSprayConfig.format
                  );
                  break;
              }
            }
          });
        });
        Promises.seq(oPromises, oResult).then(
          function(pData) {
            LOGGER.debug("[%s] Done processing spray.", pParams.parent);
            resolve(pData);
          },
          function(pError) {
            LOGGER.error(
              "[%s] Unexpected error spraying.",
              pParams.parent,
              pError
            );
            reject(pError);
          }
        );
      } catch (e) {
        LOGGER.error(
          "[%s] Unexpected error processing step.",
          pParams.parent,
          e
        );
        reject(e);
      }
    });
  }
}
