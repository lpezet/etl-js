import * as Promises from "./promises";
import { AbstractMod } from "./mod";
import TemplateEngine from "./templating/engine";
import { createLogger } from "./logger";
import { Executor } from "./executors";
import Context from "./context";

const LOGGER = createLogger("etljs::files");

/**
 * @param pPreviousData previous data
 * @param pKey key
 * @param func function
 * @param data data
 */
function asPromised(
  pPreviousData: any,
  pKey: string,
  func: (any?: any) => void,
  data: any
): void {
  try {
    if (!pPreviousData.files[pKey]) pPreviousData.files[pKey] = {};
    pPreviousData.files[pKey] = data;
    func(pPreviousData);
  } catch (e) {
    LOGGER.error("Unexpected error asPromised.", e);
  }
}

export type Permissions = {
  mode?: string;
  group?: string;
  owner?: string;
};

export type Data = {
  error?: Error;
  result?: any;
  message?: string;
  exit: boolean;
  pass: boolean;
  _stdout?: string | null;
  _stderr?: string | null;
};

export default class FilesMod extends AbstractMod<any> {
  mTemplateEngine: TemplateEngine;
  constructor(pSettings?: any) {
    super("files", pSettings || {});
    this.mTemplateEngine = new TemplateEngine();
  }
  _handlePerms(
    pParent: string,
    pExecutor: Executor,
    pTarget: string,
    pPerms: Permissions
  ): Promise<void> {
    if (!pPerms["mode"] || !pPerms["group"] || !pPerms["owner"]) {
      return Promise.resolve();
    }

    let oCmd = '[ -f "' + pTarget + '" ]';
    if (pPerms["mode"]) {
      oCmd += " && chmod " + pPerms.mode + ' "' + pTarget + '"';
    }
    if (pPerms["group"]) {
      oCmd += " && chgrp " + pPerms.group + ' "' + pTarget + '"';
    }
    if (pPerms["owner"]) {
      oCmd += " && chown " + pPerms.owner + ' "' + pTarget + '"';
    }
    return new Promise(function(resolve, reject) {
      LOGGER.debug(
        "[%s] File: setting permissions: cmd=[%s]...",
        pParent,
        oCmd
      );
      pExecutor.exec(oCmd, {}, function(error, _stdout, _stderr) {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  _singleDownload(
    pParent: string,
    pExecutor: Executor,
    pTarget: string,
    pSource: string,
    pPerms: Permissions,
    _pContext: Context
  ) {
    return (pPreviousData: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        // TODO: Handle templates here for pSource and pTarget.
        // Example:
        // pTarget: /tmp/{{ $.step1.commands.001_test.result }}
        // pSource: http://a.b.c/{{ $.step1.commands.001_test.result }}/download
        //
        LOGGER.debug(
          "[%s] File: source=[%s], target=[%s]...",
          pParent,
          pSource,
          pTarget
        );
        const data: Data = {
          exit: false,
          pass: false
        };
        try {
          pExecutor.exec(
            '[ ! -d $(dirname "' +
              pTarget +
              '") ] && mkdir -p $(dirname "' +
              pTarget +
              '"); wget -O "' +
              pTarget +
              '" "' +
              pSource +
              '" 2>&1',
            {},
            (
              error?: Error | null,
              stdout?: string | null,
              stderr?: string | null
            ) => {
              if (error) data.error = error;
              data.pass = true; // ???
              data["_stdout"] = stdout;
              data["_stderr"] = stderr;
              // var func = null;

              if (error) {
                LOGGER.error(
                  "[%s] Error getting file [%s].",
                  pParent,
                  pSource,
                  error
                );
                // reject( error );
                // func = reject;
                data.result = stderr;

                asPromised(pPreviousData, pTarget, reject, data);
              } else {
                data.result = stdout;

                this._handlePerms(pParent, pExecutor, pTarget, pPerms).then(
                  function() {
                    asPromised(pPreviousData, pTarget, resolve, data);
                  },
                  function(error: Error) {
                    data.result = error;
                    asPromised(pPreviousData, pTarget, reject, data);
                  }
                );
                // resolve();
                // func = resolve;
                // data.result = stdout;
              }
              // asPromised( pPreviousData, pTarget, func, data );
            }
          );
        } catch (e) {
          data.error = e;
          asPromised(pPreviousData, pTarget, reject, data);
        }
      });
    };
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
  _download(
    pParent: string,
    pExecutor: Executor,
    pTarget: string,
    pSource: string,
    pPerms: Permissions,
    pContext: Context
  ): (data?: any) => Promise<any> {
    let oSources = [pSource];
    if (pSource.includes("{{")) {
      oSources = this._evaluate(pSource, pContext) || [];
    }
    let oTargets = [pTarget];
    if (pTarget.includes("{{")) {
      oTargets = this._evaluate(pTarget, pContext) || [];
    }
    // TODO: check when oSources and oTargets.length == 0
    if (oSources.length !== oTargets.length) {
      return function() {
        return Promise.reject(
          new Error(
            "Template used in source/target do not match (sources=[" +
              oSources +
              "], targets=[" +
              oTargets +
              "])"
          )
        );
        /* {
          error:
            "Template used in source/target do not match (sources=[" +
            oSources +
            "], targets=[" +
            oTargets +
            "])",
          result: null,
          message: null,
          exit: false,
          pass: true,
          _stdout: null,
          _stderr: null
        });
        */
      };
    }
    LOGGER.debug("[%s] Downloading %s file(s)...", pParent, oSources.length);
    if (oSources.length === 1) {
      return this._singleDownload(
        pParent,
        pExecutor,
        oTargets[0],
        oSources[0],
        pPerms,
        pContext
      );
    } else {
      return (_pPreviousData: any) => {
        return new Promise((resolve, reject) => {
          try {
            const oData = { files: {} };
            const oPromises = [];
            for (let i = 0; i < oSources.length; i++) {
              const oSource = oSources[i];
              const oTarget = oTargets[i];
              oPromises.push(
                this._singleDownload(
                  pParent,
                  pExecutor,
                  oTarget,
                  oSource,
                  pPerms,
                  pContext
                )
              );
            }
            Promises.seq(oPromises, oData).then(
              function(_pData) {
                LOGGER.debug("[%s] Done processing multiple files.", pParent);
                // console.log('files_download.then(): pData=');
                // console.dir( pData );
                // console.log('oData=');
                // console.dir( oData );
                // resolve( pData );
                resolve(oData);
              },
              function(pError) {
                LOGGER.error(
                  "[%s] Unexpected error getting multiple files.",
                  pParent,
                  pError
                );
                reject(pError);
              }
            );
          } catch (e) {
            LOGGER.error(
              "[%s] Unexpected error processing multiple files.",
              pParent,
              e
            );
            reject(e);
          }
        });
      };
    }
  }
  _create(
    pParent: string,
    pExecutor: Executor,
    pTarget: string,
    pContent: string,
    pPerms: Permissions,
    _pContext: Context
  ): (data: any) => Promise<any> {
    return (pPreviousData: any) => {
      return new Promise((resolve, reject) => {
        pExecutor.writeFile(pTarget, pContent, (error, stdout, stderr) => {
          const data: Data = {
            exit: false,
            pass: true,
            _stdout: stdout,
            _stderr: stderr
          };
          // var func = null;

          if (error) {
            LOGGER.error(
              "[%s] Error creating file with content.",
              pParent,
              error
            );
            // reject( error );
            // func = reject;
            data.result = stderr || "";
            asPromised(pPreviousData, pTarget, reject, data);
          } else {
            LOGGER.debug("[%s] Done creating file with content.", pParent);
            data.result = stdout;
            this._handlePerms(pParent, pExecutor, pTarget, pPerms).then(
              function() {
                asPromised(pPreviousData, pTarget, resolve, data);
              },
              function(error: Error) {
                data.result = error;
                asPromised(pPreviousData, pTarget, reject, data);
              }
            );
            // resolve( stdout );
            // func = resolve;
          }
        });
      });
    };
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
      LOGGER.debug("[%s] Processing files...", pParent);
      // console.log('files: Activity Context=');
      // console.dir( pActivityContext );
      // console.log('files: Global Context=');
      // console.dir( pGlobalContext );
      const oData = { files: {} };
      const oPromises: ((data: any) => Promise<any>)[] = [];
      Object.keys(pConfig).forEach(i => {
        const oTarget = i;

        if (pConfig[i].source) {
          const oSource = pConfig[i].source;
          // logger.debug('[%s] File(s): source=[%s], target=[%s]...', pParent, oSource, oTarget);
          oPromises.push(
            this._download(
              pParent,
              pExecutor,
              oTarget,
              oSource,
              pConfig[i],
              pContext
            )
          );
        } else if (pConfig[i].content) {
          const oContent = pConfig[i].content;
          LOGGER.debug(
            "[%s] Creating file [%s] with content...",
            pParent,
            oTarget
          );
          oPromises.push(
            this._create(
              pParent,
              pExecutor,
              oTarget,
              oContent,
              pConfig[i],
              pContext
            )
          );
        }
      });

      Promises.seq(oPromises, oData).then(
        function(pData) {
          LOGGER.debug("[%s] Done processing files.", pParent);
          // resolve( pData );
          // console.log('files.handle(): pData=');
          // console.dir( pData );
          // console.log('oData=');
          // console.dir(oData);

          resolve(pData);
        },
        function(pError) {
          LOGGER.error("[%s] Error creating/getting file(s).", pParent, pError);
          reject(pError);
        }
      );
    });
  }
}
