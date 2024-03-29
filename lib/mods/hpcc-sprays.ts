import * as Promises from "../promises";
import { AbstractMod, ModParameters, ModResult, ModStatus } from "../mod";
import TemplateEngine from "../templating/engine";
import { Logger, createLogger } from "../logger";
import { Executor } from "../executors";
import Context from "../context";

const LOGGER: Logger = createLogger("etljs::mods::hpcc-desprays");

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
  constructor(pSettings?: any) {
    super("hpcc-sprays", pSettings || {});
    super.templateEngine = new TemplateEngine();
  }
  _sprayError(
    pParent: string,
    pKey: string,
    pConfig: any
  ): (data: any) => Promise<any> {
    let message = "";
    const format = pConfig["format"];
    if (!format) {
      message = `Must specify spray format (fixed|csv|delimited|json|variable|variablebigendian|xml|recfmv|recfmb|variablebigendian) for [${pParent}:${pKey}].`;
    } else {
      message = `Format specified [${format}] not supported for [${pParent}:${pKey}].`;
    }
    return function(_pPreviousData: any) {
      const data = {
        error: new Error(message),
        result: null,
        message: null,
        exit: false,
        pass: true,
        _stdout: null,
        _stderr: null
      };
      LOGGER.error(`[%s] ${message}`, pParent, pKey);
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
            pValue: string | null,
            pDefault: number
          ): number {
            if (pValue === null) return pDefault;
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

            const value = super.evaluateSingle(
              pSprayConfig[k],
              pContext,
              pTemplateIndex
            );
            switch (k) {
              // case "espserveripport": // this is from ECL SprayDelimited documentation, not from dfuplus...
              case "server":
                if (value !== null) oCmdArgs.push("server=" + value);
                break;
              case "username":
                if (value !== null) oCmdArgs.push("username=" + value);
                break;
              case "password":
                if (value !== null) oCmdArgs.push("password=" + value);
                break;
              case "sourceip":
                if (value !== null) oCmdArgs.push("srcip=" + value);
                break;
              case "sourcepath":
                if (value !== null) oCmdArgs.push("srcfile=" + value);
                break;
              case "format":
                if (value !== null) oCmdArgs.push("format=" + value);
                break;
              case "maxconnections":
                if (value !== null) oCmdArgs.push("connect=" + value);
                break;
              case "timeout": {
                const oTimeoutValue = safeParseInt(value, -999);
                if (oTimeoutValue === 0) oCmdArgs.push("nowait=1");
                else oCmdArgs.push("nowait=0");
                break;
              }
              case "destinationlogicalname":
                if (value !== null) oCmdArgs.push("dstname=" + value);
                break;
              case "destinationgroup":
                if (value !== null) oCmdArgs.push("dstcluster=" + value);
                break;
              case "allowoverwrite":
                oCmdArgs.push("overwrite=" + zeroOne(value));
                break;
              case "replicate":
                oCmdArgs.push("replicate=" + zeroOne(value));
                break;
              case "compress":
                oCmdArgs.push("compress=" + zeroOne(value));
                break;
              case "failifnosourcefile":
                oCmdArgs.push("failifnosourcefile=" + zeroOne(value));
                break;
              case "expiredays":
                if (value !== null) oCmdArgs.push("expiredays=" + value);
                break;
              case "quotedterminator":
                if (value !== null) {
                  oCmdArgs.push("quotedTerminator=" + zeroOne(value));
                }
                break;
              case "recordstructurepresent":
                if (value !== null) {
                  oCmdArgs.push("recordstructurepresent=" + zeroOne(value));
                }
                break;
              case "encoding":
                if (value !== null) oCmdArgs.push("encoding=" + value);
                break;
              case "srccsvseparator":
                if (value !== null) {
                  oCmdArgs.push("srccsvseparator=" + reEscape(value));
                }
                break;
              case "srccsvterminator":
                if (value !== null) {
                  oCmdArgs.push("srccsvterminator=" + reEscape(value));
                }
                break;
              case "srccsvquote":
                if (value !== null) oCmdArgs.push("quote=\\" + value); // TODO: is that right to escape here?
                break;
              case "maxrecordsize":
                if (value !== null) oCmdArgs.push("maxrecordsize=" + value);
                break;
              case "sourcecsvescape":
                if (value !== null) oCmdArgs.push("escape=" + value);
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
            error: e as Error,
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
          const oLogicalFileNames = super.evaluate(i, pParams.context) || [i];
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
              oPromises.push(this._sprayError(pParams.parent, e, oSprayConfig));
            } else {
              switch (oSprayConfig.format) {
                case "delimited":
                case "json":
                case "xml":
                case "variable":
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
                case "recfmvb":
                case "recfmv":
                case "variablebigendian":
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
                default:
                  oPromises.push(
                    this._sprayError(pParams.parent, e, oSprayConfig)
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
