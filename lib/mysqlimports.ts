import Mod from "./mod";
import { Executor } from "./executors";
import Context from "./context";
import { IETL } from "./etl";
import { createLogger } from "./logger";
import * as Promises from "./promises";
import TemplateEngine from "./templating/engine";

const LOGGER = createLogger("etljs::mysqlimports");

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
  if (!pPreviousData.mysqlimports[pKey]) pPreviousData.mysqlimports[pKey] = {};
  pPreviousData.mysqlimports[pKey] = data;
  //if ( data['exit'] ) {
  //	pPreviousData['_exit'] = data['exit'];
  //	pPreviousData['_exit_from'] = pKey;
  //}
  func(pPreviousData);
};

export default class MySQLImportsMod implements Mod {
  mSettings: any;
  mTemplateEngine: TemplateEngine;
  constructor(pETL: IETL, pSettings?: any) {
    this.mSettings = pSettings || {};
    var that = this;
    if (pETL)
      pETL.mod("mysqlimports", this, function (pSettings: any) {
        that.mSettings = {
          ...that.mSettings,
          ...pSettings,
        };
      });
    this.mTemplateEngine = new TemplateEngine();
  }
  _evaluate(pTemplate: string, pContext: Context) {
    return this.mTemplateEngine.evaluate(pTemplate, pContext);
  }
  _apply_settings(pParent: string, pKey: string, pConfig: any) {
    var apply_settings = function (pConfig: any, pSettings: any) {
      for (var i in pSettings) {
        if (pConfig[i] == null) pConfig[i] = pSettings[i];
      }
    };
    if (this.mSettings[pKey]) apply_settings(pConfig, this.mSettings[pKey]);
    else if (this.mSettings[pParent])
      apply_settings(pConfig, this.mSettings[pParent]);
    else if (this.mSettings["*"]) apply_settings(pConfig, this.mSettings["*"]);
  }
  _read_options(
    pParent: string,
    pKey: string,
    pConfig: any,
    _pExecutor: Executor,
    _pContext: Context,
    _pTemplateIndex: number
  ) {
    var oOptions: any = {
      bind_address: null,
      columns: null,
      compress: null,
      debug: null,
      debug_check: null,
      debug_info: null,
      default_auth: null,
      default_character_set: null,
      defaults_extra_file: null,
      defaults_file: null,
      defaults_group_suffix: null,
      delete: null,
      enable_cleartext_plugin: null,
      fields_enclosed_by: null,
      fields_escaped_by: null,
      fields_optionally_enclosed_by: null,
      fields_terminated_by: null,
      force: null,
      get_server_public_key: null,
      host: null,
      ignore: null,
      ignore_lines: null,
      lines_terminated_by: null,
      local: true,
      lock_tables: null,
      login_path: null,
      low_priority: null,
      no_defaults: null,
      password: null,
      pipe: null,
      plugin_dir: null,
      port: null,
      protocol: null,
      replace: null,
      secure_auth: null,
      server_public_key_path: null,
      shared_memory_base_name: null,
      silent: null,
      socket: null,
      ssl_ca: null,
      ssl_capath: null,
      ssl_cert: null,
      ssl_cipher: null,
      ssl_crl: null,
      ssl_crlpath: null,
      ssl_fips_mode: null,
      ssl_key: null,
      ssl_mode: null,
      tls_cipheruites: null,
      tls_version: null,
      use_threads: null,
      user: null,
    };

    // WARNING: defaults will be affected here, don't make it a global thing, or change logic here, by first copying defaults into empty object.
    var oConfig: any = oOptions;
    for (var i in pConfig) {
      oConfig[i.toLowerCase()] = pConfig[i];
    }

    this._apply_settings(pParent, pKey, oConfig);

    return oConfig;
  }
  _wrap_run(
    pParent: string,
    pKey: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context,
    pTemplateIndex: number
  ): (res: any) => Promise<any> {
    var that = this;
    return function (pPreviousData: any) {
      LOGGER.debug("[%s] Executing mysqlimport...", pParent);
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
        LOGGER.error("[%s] Error executing mysqlimport.", pParent);
        return Promise.reject(e);
      } finally {
        LOGGER.debug("[%s] Done executing mysqlimport.", pParent);
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
    const that = this;
    return new Promise(function (resolve, reject) {
      var enclose = function (pValue: string): string {
        if (pValue.indexOf('"') >= 0) {
          return "'" + pValue + "'";
        } else if (pValue.indexOf("'") >= 0) {
          return '"' + pValue + '"';
        }
        return '"' + pValue + '"';
      };
      try {
        var oCmdArgs = [];
        for (var i in pConfig) {
          if (pConfig[i] == null) continue;
          switch (i) {
            case "bind_address":
              oCmdArgs.push("--bind-address=" + pConfig[i]);
              break;
            case "columns":
              oCmdArgs.push("--columns=" + pConfig[i]);
              break;
            case "compress":
              if (pConfig[i]) oCmdArgs.push("--compress");
              break;
            case "debug":
              oCmdArgs.push("--debug=" + pConfig[i]);
              break;
            case "debug_check":
              if (pConfig[i]) oCmdArgs.push("--debug-check");
              break;
            case "debug_info":
              if (pConfig[i]) oCmdArgs.push("--debug-info");
              break;
            case "default_auth":
              oCmdArgs.push("--default-auth=" + pConfig[i]);
              break;
            case "default_character_set":
              oCmdArgs.push("--default-character-set=" + pConfig[i]);
              break;
            case "defaults_extra_file":
              oCmdArgs.push("--defaults-extra-file=" + pConfig[i]);
              break;
            case "defaults_file":
              oCmdArgs.push("--defaults-file=" + pConfig[i]);
              break;
            case "defaults_group_suffix":
              oCmdArgs.push("--defaults-group-suffix=" + pConfig[i]);
              break;
            case "delete":
              if (pConfig[i]) oCmdArgs.push("--delete");
              break;
            case "enable_cleartext_plugin":
              if (pConfig[i]) oCmdArgs.push("--enable-cleartext-plugin");
              break;
            case "fields_enclosed_by":
              oCmdArgs.push("--fields-enclosed-by=" + enclose(pConfig[i]));
              break;
            case "fields_escaped_by":
              oCmdArgs.push("--fields-escaped-by=" + enclose(pConfig[i]));
              break;
            case "fields_optionally_enclosed_by":
              oCmdArgs.push(
                "--fields-optionally-enclosed-by=" + enclose(pConfig[i])
              );
              break;
            case "fields_terminated_by":
              oCmdArgs.push("--fields-terminated-by=" + enclose(pConfig[i]));
              break;
            case "force":
              if (pConfig[i]) oCmdArgs.push("--force");
              break;
            case "get_server_public_key":
              if (pConfig[i]) oCmdArgs.push("--get-server-public-key");
              break;
            case "host":
              oCmdArgs.push("--host=" + pConfig[i]);
              break;
            case "ignore":
              if (pConfig[i]) oCmdArgs.push("--ignore");
              break;
            case "ignore_lines":
              oCmdArgs.push("--ignore-lines=" + pConfig[i]);
              break;
            case "lines_terminated_by":
              oCmdArgs.push("--lines-terminated-by=" + enclose(pConfig[i]));
              break;
            case "local":
              if (pConfig[i]) oCmdArgs.push("--local");
              break;
            case "lock_tables":
              if (pConfig[i]) oCmdArgs.push("--lock-tables");
              break;
            case "login_path":
              oCmdArgs.push("--login-path=" + pConfig[i]);
              break;
            case "low_priority":
              if (pConfig[i]) oCmdArgs.push("--low-priority");
              break;
            case "no_defaults":
              if (pConfig[i]) oCmdArgs.push("--no-defaults");
              break;
            case "password":
              oCmdArgs.push("--password=" + pConfig[i]);
              break;
            case "pipe":
              if (pConfig[i]) oCmdArgs.push("--pipe");
              break;
            case "plugin_dir":
              oCmdArgs.push("--plugin-dir=" + pConfig[i]);
              break;
            case "port":
              oCmdArgs.push("--port=" + pConfig[i]);
              break;
            case "protocol":
              oCmdArgs.push("--protocol=" + pConfig[i]);
              break;
            case "replace":
              if (pConfig[i]) oCmdArgs.push("--replace");
              break;
            case "secure_auth":
              if (pConfig[i]) oCmdArgs.push("--secure-auth");
              break;
            case "server_public_key_path":
              oCmdArgs.push("--server-public-key-path=" + pConfig[i]);
              break;
            case "shared_memory_base_name":
              oCmdArgs.push("--shared-memory-base-name=" + pConfig[i]);
              break;
            case "silent":
              if (pConfig[i]) oCmdArgs.push("--silent");
              break;
            case "socket":
              oCmdArgs.push("--socket=" + pConfig[i]);
              break;
            case "ssl_ca":
              oCmdArgs.push("--ssl-ca=" + pConfig[i]);
              break;
            case "ssl_capath":
              oCmdArgs.push("--ssl-capath=" + pConfig[i]);
              break;
            case "ssl_cert":
              oCmdArgs.push("--ssl-cert=" + pConfig[i]);
              break;
            case "ssl_cipher":
              oCmdArgs.push("--ssl-cipher=" + pConfig[i]);
              break;
            case "ssl_crl":
              oCmdArgs.push("--ssl-crl=" + pConfig[i]);
              break;
            case "ssl_crlpath":
              oCmdArgs.push("--ssl-crlpath=" + pConfig[i]);
              break;
            case "ssl_fips_mode":
              oCmdArgs.push("--ssl-fips_mode=" + pConfig[i]);
              break;
            case "ssl_key":
              oCmdArgs.push("--ssl-key=" + pConfig[i]);
              break;
            case "ssl_mode":
              oCmdArgs.push("--ssl-mode=" + pConfig[i]);
              break;
            case "tls_ciphersuites":
              oCmdArgs.push("--tls-ciphersuites=" + pConfig[i]);
              break;
            case "tls_version":
              oCmdArgs.push("--tls-version=" + pConfig[i]);
              break;
            case "use_threads":
              oCmdArgs.push("--use-threads=" + pConfig[i]);
              break;
            case "user":
              oCmdArgs.push("--user=" + pConfig[i]);
              break;
            default:
              //TODO
              break;
          }
          //console.log('i=' + i + ', config=' + pConfig[i]);
        }
        var oDBName: string = pConfig["db_name"];
        if (oDBName.indexOf("{{") >= 0) {
          var oDBNames = that._evaluate(oDBName, pContext) || [];
          if (oDBNames.length < pTemplateIndex + 1) {
            return reject(
              new Error(
                "Unbalanced template. Template index at " +
                  pTemplateIndex +
                  ", total db names = " +
                  oDBNames.length
              )
            );
          }
          oDBName = oDBNames[pTemplateIndex];
        }
        oCmdArgs.push(oDBName);
        oCmdArgs.push(pKey);

        //TODO: if "table_name" given in config, maybe rename file before running mysqlimport command...or so a "ln -s" maybe???
        //See: https://stackoverflow.com/questions/2508559/using-mysqlimport-where-the-filename-is-different-from-the-table-name

        var oCmd = "/usr/bin/mysqlimport " + oCmdArgs.join(" ");
        pExecutor.exec(oCmd, { context: pKey }, function (
          error,
          stdout,
          stderr
        ) {
          var data: Data = {
            error: error,
            exit: false,
            pass: true,
            _stdout: stdout,
            _stderr: stderr,
          };
          var func = null;

          LOGGER.debug("[%s] Done executing mysqlimport.", pParent);
          if (error) {
            LOGGER.error("[%s] Error executing mysqlimport.", pParent, error);
            //reject( error );
            //if ( pConfig['exit_on_failure'] ) data.exit = true;
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
        //reject( e );
        var data: Data = {
          error: e,
          exit: false,
          pass: true,
        };
        LOGGER.error("[%s] Unexpected error running mysqlimport.", pParent, e);
        asPromised(pPreviousData, pKey, reject, data);
      }
    });
  }
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ) {
    var that = this;
    return new Promise(function (resolve, reject) {
      LOGGER.info("[%s] Processing mysqlimport...", pParent);
      try {
        var oData = { mysqlimports: {} };
        var oPromises: ((res: any) => Promise<any>)[] = [];

        for (var i in pConfig) {
          var oConfig = pConfig[i];
          var oKeys: string[] =
            i.indexOf("{{") < 0 ? [i] : that._evaluate(i, pContext) || [];
          oKeys.forEach(function (e, j) {
            var oOptions = that._read_options(
              pParent,
              e,
              oConfig,
              pExecutor,
              pContext,
              j
            );
            oPromises.push(
              that._wrap_run(pParent, e, oOptions, pExecutor, pContext, j)
            );
          });
        }
        Promises.seq(oPromises, oData).then(
          function (_pData) {
            LOGGER.info("[%s] Done running mysqlimports.", pParent);
            resolve(oData);
          },
          function (pError) {
            LOGGER.info("[%s] Error running mysqlimport.", pParent, pError);
            reject(pError);
          }
        );
      } catch (e) {
        LOGGER.error("[%s] Unexpected error running mysqlimport.", pParent, e);
        reject(e);
      }
    });
  }
}
