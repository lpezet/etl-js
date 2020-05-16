import * as Promises from "./promises";
import { AbstractMod } from "./mod";
import TemplateEngine from "./templating/engine";
import { createLogger } from "./logger";
import { Executor } from "./executors";
import Context from "./context";

const LOGGER = createLogger("etljs::hpcc-desprays");

// var re_escape = function( pValue ) {
//	if ( pValue.indexOf("\\") < 0 ) return pValue;
//	return pValue.replace('/\\/g', '\\\\');
// }

const asPromised = function(
  pPreviousData: any,
  pKey: string,
  func: (result: any) => void,
  data: any
): void {
  if (!pPreviousData["hpcc-desprays"][pKey]) {
    pPreviousData["hpcc-desprays"][pKey] = {};
  }
  pPreviousData["hpcc-desprays"][pKey] = data;
  // if ( data['exit'] ) {
  //	pPreviousData['_exit'] = data['exit'];
  //	pPreviousData['_exit_from'] = pKey;
  // }
  func(pPreviousData);
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

export default class HPCCDespraysMod extends AbstractMod<any> {
  mTemplateEngine: TemplateEngine;
  constructor(pSettings?: any) {
    super("hpcc-desprays", pSettings || {});
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
    pContext: Context
  ): (data: any) => Promise<any> {
    LOGGER.debug(
      "[%s] Despraying to [%s]...",
      pParent,
      pConfig ? pConfig.destinationpath : "NA"
    );
    return (pPreviousData: any) => {
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

            switch (k) {
              // case "espserveripport": // this is from ECL SprayDelimited documentation, not from dfuplus...
              case "server":
                if (pConfig[k]) oCmdArgs.push("server=" + pConfig[k]);
                break;
              case "username":
                if (pConfig[k]) oCmdArgs.push("username=" + pConfig[k]);
                break;
              case "password":
                if (pConfig[k]) oCmdArgs.push("password=" + pConfig[k]);
                break;
              case "logicalname":
                if (pConfig[k]) oCmdArgs.push("srcname=" + pConfig[k]);
                break;
              case "destinationip":
                if (pConfig[k]) oCmdArgs.push("dstip=" + pConfig[k]);
                break;
              case "destinationpath":
                if (pConfig[k]) {
                  let oSrcPath = pConfig[k];
                  // console.log('srcPath=' + oSrcPath);
                  if (oSrcPath.indexOf("{{") >= 0) {
                    const v = this._evaluate(oSrcPath, pContext);
                    if (v) oSrcPath = v[0];
                  }
                  oCmdArgs.push("dstfile=" + oSrcPath);
                }
                break;
              case "destinationxml":
                if (pConfig[k]) oCmdArgs.push("dstxml=" + pConfig[k]);
                break;
              case "maxconnections":
                if (pConfig[k]) oCmdArgs.push("connect=" + pConfig[k]);
                break;
              case "timeout": {
                const oTimeoutValue = safeParseInt(pConfig[k], -999);
                if (oTimeoutValue === 0) oCmdArgs.push("nowait=1");
                else oCmdArgs.push("nowait=0");
                break;
              }
              case "allowoverwrite":
                oCmdArgs.push("overwrite=" + zeroOne(pConfig[k]));
                break;
              case "replicate":
                oCmdArgs.push("replicate=" + zeroOne(pConfig[k]));
                break;
              case "compress":
                oCmdArgs.push("compress=" + zeroOne(pConfig[k]));
                break;
              case "splitprefix":
                if (pConfig[k]) oCmdArgs.push("splitprefix=" + pConfig[k]);
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

            asPromised(pPreviousData, pKey, func, data);
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
          asPromised(pPreviousData, pKey, reject, data);
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
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ): Promise<any> {
    // pCurrentActivityResult, pGlobalResult, pContext ) {
    // var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
    return new Promise((resolve, reject) => {
      LOGGER.debug("[%s] Processing hpcc-despray...", pParent);
      try {
        const oData = { "hpcc-desprays": {} };
        const oPromises: ((data: any) => Promise<any>)[] = [];
        Object.keys(pConfig).forEach(i => {
          let oLogicalFileName = i;
          if (oLogicalFileName.includes("{{")) {
            const v = this._evaluate(oLogicalFileName, pContext);
            if (v && v.length >= 1) oLogicalFileName = v[0];
            // TODO: log in case length not right or v null
          }
          const oDesprayConfig = this._readConfig(pParent, i, pConfig[i]);
          if (!oDesprayConfig.logicalname) {
            oDesprayConfig.logicalname = oLogicalFileName;
          }

          if (
            (!oDesprayConfig.destinationpath ||
              !oDesprayConfig.destinationip) &&
            !oDesprayConfig.destinationxml
          ) {
            oPromises.push(this._desprayError(pParent, oLogicalFileName));
          } else {
            oPromises.push(
              this._despray(
                pParent,
                oLogicalFileName,
                oDesprayConfig,
                pExecutor,
                pContext
              )
            );
          }
        });
        Promises.seq(oPromises, oData).then(
          function() {
            LOGGER.debug("[%s] Done processing hpcc-despray.", pParent);
            resolve(oData);
          },
          function(pError) {
            LOGGER.error(
              "[%s] Unexpected error in hpcc-despray.",
              pParent,
              pError
            );
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
