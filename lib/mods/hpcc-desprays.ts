import * as Promises from "../promises";
import { AbstractMod, ModParameters, ModResult, ModStatus } from "../mod";
import TemplateEngine from "../templating/engine";
import { Logger, createLogger } from "../logger";
import { Executor } from "../executors";
import Context from "../context";

const LOGGER: Logger = createLogger("etljs::mods::hpcc-desprays");

export type HPCCDespraysState = {
  desprays: any[];
};

// var re_escape = function( pValue ) {
//	if ( pValue.indexOf("\\") < 0 ) return pValue;
//	return pValue.replace('/\\/g', '\\\\');
// }
const asPromised = function(
  pResults: ModResult<HPCCDespraysState>,
  pFunc: (results: any) => void,
  pParent: string,
  pKey: string,
  pData: Data
): void {
  LOGGER.debug("[%s] Despray [%s] results:\n%j", pParent, pKey, pData);
  const data = {
    key: pKey,
    results: pData,
    exit: Boolean(pData["exit"]),
    skip: Boolean(pData["skip"])
  };
  if (pData.exit) pResults.status = ModStatus.EXIT;
  if (pData.skip) pResults.status = ModStatus.STOP;
  pResults.state?.desprays.push(data);
  pFunc(pResults);
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

export default class HPCCDespraysMod extends AbstractMod<any, any> {
  constructor(pSettings?: any) {
    super("hpcc-desprays", pSettings || {});
    super.templateEngine = new TemplateEngine();
  }
  _desprayError(pParent: string, pKey: string): () => Promise<any> {
    return function() {
      const data = {
        error:
          "Must specify destination destinationPath and destinationIP or destinationXML for [" +
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
        "[%s] Must specify destination destinationPath and destinationIP or destinationXML for [%s].",
        pParent,
        pKey
      );
      return Promise.reject(data);
    };
  }
  _despray(
    pParent: string,
    pKey: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context,
    pTemplateIndex: number
  ): (
    data: ModResult<HPCCDespraysState>
  ) => Promise<ModResult<HPCCDespraysState>> {
    LOGGER.debug(
      "[%s] Despraying to [%s]...",
      pParent,
      pConfig ? pConfig.destinationpath : "NA"
    );
    return (pResults: ModResult<HPCCDespraysState>) => {
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
          oCmdArgs.push("action=despray");

          const ATTRS: any = {
            // "espserveripport": true
            logicalname: true,
            destinationip: true,
            destinationpath: true,
            destinationxml: true,
            allowoverwrite: true,
            server: true,
            username: true,
            password: true,
            compress: true,
            maxconnections: true,
            timeout: true,
            replicate: true,
            splitprefix: true
          };
          Object.keys(pConfig).forEach(k => {
            k = String(k).toLowerCase();

            if (!ATTRS[k]) {
              LOGGER.warn(
                "[%s] Unrecognized property %s for [%s]. Skipping it.",
                pParent,
                k,
                pKey
              );
              return;
            }
            const value = super.evaluateSingle(
              pConfig[k],
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
              case "logicalname":
                if (value !== null) oCmdArgs.push("srcname=" + pConfig[k]);
                break;
              case "destinationip":
                if (value !== null) oCmdArgs.push("dstip=" + pConfig[k]);
                break;
              case "destinationpath":
                if (value !== null) {
                  oCmdArgs.push("dstfile=" + value);
                }
                break;
              case "destinationxml":
                if (value !== null) oCmdArgs.push("dstxml=" + value);
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
              case "allowoverwrite":
                oCmdArgs.push("overwrite=" + zeroOne(value));
                break;
              case "replicate":
                oCmdArgs.push("replicate=" + zeroOne(value));
                break;
              case "compress":
                oCmdArgs.push("compress=" + zeroOne(value));
                break;
              case "splitprefix":
                if (value !== null) oCmdArgs.push("splitprefix=" + value);
                break;
              default:
                LOGGER.warn(
                  "[%s] Skipping property [%s]. Not supported.",
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
                "[%s] Error while executing despraying command.",
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
          const data = {
            error: e,
            result: null,
            message: null,
            exit: false,
            pass: true,
            _stdout: null,
            _stderr: null
          };
          LOGGER.error("[%s] Unexpected error despraying", e);
          asPromised(pResults, reject, pParent, pKey, data);
        }
      });
    };
  }
  _readConfig(pParent: string, pKey: string, pConfig: any): any {
    const oDefaults: any = {
      logicalname: null,
      destinationip: null,
      destinationpath: null,
      destinationxml: null,
      splitprefix: null,
      timeout: -1,
      // espserveripport: null,
      maxconnections: 25,
      allowoverwrite: "0",
      replicate: "1",
      compress: "0"
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
  handle(pParams: ModParameters): Promise<ModResult<HPCCDespraysState>> {
    // pCurrentActivityResult, pGlobalResult, pContext ) {
    // var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
    return new Promise((resolve, reject) => {
      LOGGER.debug("[%s] Processing hpcc-despray...", pParams.parent);
      try {
        // const oData = { "hpcc-desprays": {} };
        const oResult: ModResult<HPCCDespraysState> = {
          exit: false,
          skip: false,
          status: ModStatus.CONTINUE,
          state: { desprays: [] }
        };
        const oPromises: ((data: any) => Promise<any>)[] = [];
        Object.keys(pParams.config).forEach(i => {
          const oLogicalFileNames = super.evaluate(i, pParams.context) || [i];
          oLogicalFileNames.forEach((f: string, j: number) => {
            const oDesprayConfig = this._readConfig(
              pParams.parent,
              i,
              pParams.config[i]
            );
            if (!oDesprayConfig.logicalname) {
              oDesprayConfig.logicalname = f;
            }

            if (
              (!oDesprayConfig.destinationpath ||
                !oDesprayConfig.destinationip) &&
              !oDesprayConfig.destinationxml
            ) {
              oPromises.push(this._desprayError(pParams.parent, f));
            } else {
              oPromises.push(
                this._despray(
                  pParams.parent,
                  f,
                  oDesprayConfig,
                  pParams.executor,
                  pParams.context,
                  j
                )
              );
            }
          });
        });
        Promises.seq(oPromises, oResult).then(
          function(pData: ModResult<HPCCDespraysState>) {
            LOGGER.debug("[%s] Done processing hpcc-despray.", pParams.parent);
            resolve(pData);
          },
          function(pError) {
            LOGGER.error(
              "[%s] Unexpected error in hpcc-despray.",
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
