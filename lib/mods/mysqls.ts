import {
  AbstractMod,
  ModParameters,
  ModResult,
  ModSettings,
  ModStatus
} from "../mod";
import { Executor } from "../executors";
import Context from "../context";
import { Logger, createLogger } from "../logger";
import * as Promises from "../promises";
import TemplateEngine from "../templating/engine";

const LOGGER: Logger = createLogger("etljs::mysqlimports");

export type Data = {
  error?: Error | null;
  result?: any | null;
  message?: string | null;
  exit: boolean;
  pass: boolean;
  _stdout?: string | null;
  _stderr?: string | null;
};

export type MySQLState = {
  mysqls: any;
};

export type MySQLOptions = {
  // eslint-disable-next-line camelcase
  bind_address?: string;
  columns?: boolean;
  compress?: boolean;
  debug?: string;
  // eslint-disable-next-line camelcase
  debug_check?: boolean;
  // eslint-disable-next-line camelcase
  debug_info?: boolean;
  // eslint-disable-next-line camelcase
  default_auth?: string;
  // eslint-disable-next-line camelcase
  default_character_set?: string;
  // eslint-disable-next-line camelcase
  defaults_extra_file?: string;
  // eslint-disable-next-line camelcase
  defaults_file?: string;
  // eslint-disable-next-line camelcase
  defaults_group_suffix?: string;
  // delete: null;
  // eslint-disable-next-line camelcase
  enable_cleartext_plugin?: boolean;
  // eslint-disable-next-line camelcase
  fields_enclosed_by?: string;
  // eslint-disable-next-line camelcase
  fields_escaped_by?: string;
  // eslint-disable-next-line camelcase
  fields_optionally_enclosed_by?: string;
  // eslint-disable-next-line camelcase
  fields_terminated_by?: string;
  force?: boolean;
  // eslint-disable-next-line camelcase
  get_server_public_key?: boolean;
  host?: string;
  // ignore: null;
  // eslint-disable-next-line camelcase
  ignore_lines?: number;
  // eslint-disable-next-line camelcase
  lines_terminated_by?: string;
  local?: boolean;
  // eslint-disable-next-line camelcase
  // lock_tables: null;
  // eslint-disable-next-line camelcase
  login_path?: string;
  // eslint-disable-next-line camelcase
  low_priority?: boolean;
  // eslint-disable-next-line camelcase
  no_defaults?: boolean;
  password?: string;
  pipe?: boolean;
  // eslint-disable-next-line camelcase
  plugin_dir?: string;
  port?: number;
  protocol?: string;
  // replace: null;
  // eslint-disable-next-line camelcase
  secure_auth?: boolean;
  // eslint-disable-next-line camelcase
  server_public_key_path?: string;
  // eslint-disable-next-line camelcase
  shared_memory_base_name?: string;
  silent?: boolean;
  socket?: string;
  // eslint-disable-next-line camelcase
  ssl_ca?: string;
  // eslint-disable-next-line camelcase
  ssl_capath?: string;
  // eslint-disable-next-line camelcase
  ssl_cert?: string;
  // eslint-disable-next-line camelcase
  ssl_cipher?: string;
  // eslint-disable-next-line camelcase
  ssl_crl?: string;
  // eslint-disable-next-line camelcase
  ssl_crlpath?: string;
  // eslint-disable-next-line camelcase
  ssl_fips_mode?: string;
  // eslint-disable-next-line camelcase
  ssl_key?: string;
  // eslint-disable-next-line camelcase
  ssl_mode?: string;
  // eslint-disable-next-line camelcase
  tls_cipheruites?: string;
  // eslint-disable-next-line camelcase
  tls_version?: string;
  // eslint-disable-next-line camelcase
  use_threads?: boolean;
  user?: string;
};

export type MySQLSettings = ModSettings & {
  settings?: {
    [key: string]: MySQLOptions;
  };
};

const asPromised = function(
  pPreviousData: any,
  pKey: string,
  func: (value: any) => void,
  data: any
): void {
  if (!pPreviousData.mysqls[pKey]) pPreviousData.mysqls[pKey] = {};
  pPreviousData.mysqls[pKey] = data;
  func(pPreviousData);
};

export default class MySQLsMod extends AbstractMod<MySQLState, MySQLSettings> {
  mSettings: any;
  mTemplateEngine: TemplateEngine;
  constructor(pSettings?: MySQLSettings) {
    super("mysqls", pSettings);
    this.mTemplateEngine = new TemplateEngine();
  }
  _evaluate(pTemplate: string, pContext: Context): string[] | null {
    return this.mTemplateEngine.evaluate(pTemplate, pContext);
  }
  _applySettings(pParent: string, pKey: string, pConfig: MySQLOptions): void {
    const applySettings = function(
      pConfig: MySQLOptions,
      pSettings: MySQLOptions
    ): void {
      const oSettings: MySQLOptions = {};
      Object.assign(oSettings, pSettings);
      (Object.keys(pSettings) as (keyof MySQLOptions)[]).forEach(i => {
        if (pConfig[i] !== null) {
          delete oSettings[i];
        }
      });
      Object.assign(pConfig, oSettings);
    };
    if (this.mSettings.settings) {
      if (this.mSettings.settings[pKey]) {
        console.log("Applying settings with key: " + pKey);
        applySettings(pConfig, this.mSettings.settings[pKey]);
      } else if (this.mSettings.settings[pParent]) {
        console.log("Applying settings with parent: " + pParent);
        applySettings(pConfig, this.mSettings.settings[pParent]);
      } else if (this.mSettings.settings["*"]) {
        console.log("Applying settings with *");
        applySettings(pConfig, this.mSettings.settings["*"]);
      }
    }
  }
  _readOptions(
    pParent: string,
    pKey: string,
    pConfig: MySQLOptions,
    _pExecutor: Executor,
    _pContext: Context,
    _pTemplateIndex: number
  ): any {
    const oOptions: any = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      bind_address: null,
      columns: null,
      compress: null,
      debug: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      debug_check: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      debug_info: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      default_auth: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      default_character_set: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      defaults_extra_file: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      defaults_file: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      defaults_group_suffix: null,
      delete: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      enable_cleartext_plugin: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      fields_enclosed_by: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      fields_escaped_by: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      fields_optionally_enclosed_by: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      fields_terminated_by: null,
      force: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      get_server_public_key: null,
      host: null,
      ignore: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      ignore_lines: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      lines_terminated_by: null,
      local: true,
      // eslint-disable-next-line @typescript-eslint/camelcase
      lock_tables: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      login_path: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      low_priority: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      no_defaults: null,
      password: null,
      pipe: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      plugin_dir: null,
      port: null,
      protocol: null,
      replace: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      secure_auth: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      server_public_key_path: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      shared_memory_base_name: null,
      silent: null,
      socket: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      ssl_ca: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      ssl_capath: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      ssl_cert: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      ssl_cipher: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      ssl_crl: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      ssl_crlpath: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      ssl_fips_mode: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      ssl_key: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      ssl_mode: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      tls_cipheruites: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      tls_version: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      use_threads: null,
      user: null
    };

    // WARNING: defaults will be affected here, don't make it a global thing, or change logic here, by first copying defaults into empty object.
    const oConfig: MySQLOptions = oOptions;
    Object.assign(oConfig, pConfig);
    this._applySettings(pParent, pKey, oConfig);
    return oConfig;
  }
  _wrapRun(
    pParent: string,
    pKey: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context,
    pTemplateIndex: number
  ): (data: any) => Promise<any> {
    return (pPreviousData: any) => {
      LOGGER.debug("[%s] Executing mysql...", pParent);
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
        LOGGER.error("[%s] Error executing mysql.", pParent);
        return Promise.reject(e); // TODO
      } finally {
        LOGGER.debug("[%s] Done executing mysql.", pParent);
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
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const escapeSingleQuotes = function(pValue: string): string {
        return pValue.replace(/'/g, "\\'");
      };
      try {
        const oCmdArgs = [];
        for (const i in pConfig) {
          if (pConfig[i] == null) continue;
          switch (i) {
            case "auto_rehash":
              if (pConfig[i]) oCmdArgs.push("--auto-rehash");
              break;
            case "auto_vertical_output":
              if (pConfig[i]) oCmdArgs.push("--auto-vertical-output");
              break;
            case "batch":
              if (pConfig[i]) oCmdArgs.push("--batch");
              break;
            case "binary_as_hex":
              if (pConfig[i]) oCmdArgs.push("--binary-as-hex");
              break;
            case "binary_mode":
              if (pConfig[i]) oCmdArgs.push("--binary-mode");
              break;
            case "bind_address":
              oCmdArgs.push(`--bind-address=${pConfig[i]}`);
              break;
            case "character_sets_dir":
              oCmdArgs.push(`--character-sets-dir=${pConfig[i]}`);
              break;
            case "column_names":
              oCmdArgs.push(`--columns=${pConfig[i]}`);
              break;
            case "column_type_info":
              if (pConfig[i]) oCmdArgs.push("--column-type-info");
              break;
            case "comments":
              if (pConfig[i]) oCmdArgs.push("--comments");
              break;
            case "compress":
              if (pConfig[i]) oCmdArgs.push("--compress");
              break;
            case "connect_expired_password":
              if (pConfig[i]) oCmdArgs.push("--connect-expired-password");
              break;
            case "connect_timeout":
              oCmdArgs.push(`--connect_timeout=${pConfig[i]}`);
              break;
            // case "database":
            case "debug":
              oCmdArgs.push(`--debug=${pConfig[i]}`);
              break;
            case "debug_check":
              if (pConfig[i]) oCmdArgs.push("--debug-check");
              break;
            case "debug_info":
              if (pConfig[i]) oCmdArgs.push("--debug-info");
              break;
            case "default_auth":
              oCmdArgs.push(`--default-auth=${pConfig[i]}`);
              break;
            case "default_character_set":
              oCmdArgs.push(`--default-character-set=${pConfig[i]}`);
              break;
            case "defaults_extra_file":
              oCmdArgs.push(`--defaults-extra-file=${pConfig[i]}`);
              break;
            case "defaults_file":
              oCmdArgs.push(`--defaults-file=${pConfig[i]}`);
              break;
            case "defaults_group_suffix":
              oCmdArgs.push(`--defaults-group-suffix=${pConfig[i]}`);
              break;
            case "delimiter":
              oCmdArgs.push(`--delimiter=${pConfig[i]}`);
              break;
            case "enable_cleartext_plugin":
              if (pConfig[i]) oCmdArgs.push("--enable-cleartext-plugin");
              break;
            case "execute": {
              // TODO: need to escape?
              let oExecuteRaw = pConfig[i];
              if (oExecuteRaw.indexOf("{{") >= 0) {
                const oExecuteRaws = this._evaluate(oExecuteRaw, pContext);
                // TODO: check index vs length
                if (oExecuteRaws && oExecuteRaws.length > pTemplateIndex) {
                  oExecuteRaw = oExecuteRaws[pTemplateIndex];
                }
                // TODO: else, log???
              }
              oCmdArgs.push(
                "--execute='" + escapeSingleQuotes(oExecuteRaw) + "'"
              );
              break;
            }
            case "force":
              if (pConfig[i]) oCmdArgs.push("--force");
              break;
            case "get_server_public_key":
              if (pConfig[i]) oCmdArgs.push("--get-server-public-key");
              break;
            case "host":
              oCmdArgs.push("--host=" + pConfig[i]);
              break;
            case "html":
              if (pConfig[i]) oCmdArgs.push("--html");
              break;
            case "ignore_spaces":
              if (pConfig[i]) oCmdArgs.push("--ignore-spaces");
              break;
            // case "init_command":
            case "line_numbers":
              if (pConfig[i]) oCmdArgs.push("--line-numbers");
              break;
            case "local_infile":
              oCmdArgs.push(`--local-infile=${pConfig[i]}`);
              break;
            case "login_path":
              oCmdArgs.push(`--login-path=${pConfig[i]}`);
              break;
            case "max_allowed_packet":
              oCmdArgs.push(`--max_allowed_packet=${pConfig[i]}`);
              break;
            case "max_join_size":
              oCmdArgs.push(`--max_join_size=${pConfig[i]}`);
              break;
            case "named_commands":
              if (pConfig[i]) oCmdArgs.push("--named-commands");
              break;
            case "net_buffer_length":
              oCmdArgs.push(`--net_buffer_length=${pConfig[i]}`);
              break;
            case "no_auto_rehash":
              if (pConfig[i]) oCmdArgs.push("--no-auto-rehash");
              break;
            case "no_beep":
              if (pConfig[i]) oCmdArgs.push("--no-beep");
              break;
            case "no_defaults":
              if (pConfig[i]) oCmdArgs.push("--no-defaults");
              break;
            case "one_database":
              if (pConfig[i]) oCmdArgs.push("--one-database");
              break;
            case "pager":
              oCmdArgs.push(`--pager=${pConfig[i]}`);
              break;
            case "password":
              oCmdArgs.push(`--password=${pConfig[i]}`);
              break;
            case "pipe":
              if (pConfig[i]) oCmdArgs.push("--pipe");
              break;
            case "plugin_dir":
              oCmdArgs.push(`--plugin-dir=${pConfig[i]}`);
              break;
            case "port":
              oCmdArgs.push(`--port=${pConfig[i]}`);
              break;
            // case "print-defaults":
            // case "prompt": // ???
            case "protocol":
              oCmdArgs.push(`--protocol=${pConfig[i]}`);
              break;
            case "quick":
              if (pConfig[i]) oCmdArgs.push("--quick");
              break;
            case "raw":
              if (pConfig[i]) oCmdArgs.push("--raw");
              break;
            case "reconnect":
              if (pConfig[i]) oCmdArgs.push("--reconnect");
              break;
            case "i_am_a_dummy":
              if (pConfig[i]) oCmdArgs.push("--i-am-a-dummy");
              break;
            case "safe_updates":
              if (pConfig[i]) oCmdArgs.push("--safe-updates");
              break;
            case "secure_auth":
              if (pConfig[i]) oCmdArgs.push("--secure-auth");
              break;
            case "select_limit":
              oCmdArgs.push(`--select_limit=${pConfig[i]}`);
              break;
            case "server_public_key_path":
              oCmdArgs.push(`--server-public-key-path=${pConfig[i]}`);
              break;
            case "shared_memory_base_name":
              oCmdArgs.push(`--shared-memory-base-name=${pConfig[i]}`);
              break;
            case "show_warnings":
              if (pConfig[i]) oCmdArgs.push("--show-warnings");
              break;
            case "sigint_ignore":
              if (pConfig[i]) oCmdArgs.push("--sigint-ignore");
              break;
            case "silent":
              if (pConfig[i]) oCmdArgs.push("--silent");
              break;
            case "skip_auto_rehash":
              if (pConfig[i]) oCmdArgs.push("--skip-auto-rehash");
              break;
            case "skip_column_names":
              if (pConfig[i]) oCmdArgs.push("--skip-column-names");
              break;
            case "skip_line_numbers":
              if (pConfig[i]) oCmdArgs.push("--skip-line-numbers");
              break;
            case "skip_named_commands":
              if (pConfig[i]) oCmdArgs.push("--skip-named-commands");
              break;
            case "skip_pager":
              if (pConfig[i]) oCmdArgs.push("--skip-pager");
              break;
            case "skip_reconnect":
              if (pConfig[i]) oCmdArgs.push("--skip-reconnect");
              break;
            case "socket":
              oCmdArgs.push(`--socket=${pConfig[i]}`);
              break;
            case "ssl_ca":
              oCmdArgs.push(`--ssl-ca=${pConfig[i]}`);
              break;
            case "ssl_capath":
              oCmdArgs.push(`--ssl-capath=${pConfig[i]}`);
              break;
            case "ssl_cert":
              oCmdArgs.push(`--ssl-cert=${pConfig[i]}`);
              break;
            case "ssl_cipher":
              oCmdArgs.push(`--ssl-cipher=${pConfig[i]}`);
              break;
            case "ssl_crl":
              oCmdArgs.push(`--ssl-crl=${pConfig[i]}`);
              break;
            case "ssl_crlpath":
              oCmdArgs.push(`--ssl-crlpath=${pConfig[i]}`);
              break;
            case "ssl_fips_mode":
              oCmdArgs.push(`--ssl-fips_mode=${pConfig[i]}`);
              break;
            case "ssl_key":
              oCmdArgs.push(`--ssl-key=${pConfig[i]}`);
              break;
            case "ssl_mode":
              oCmdArgs.push(`--ssl-mode=${pConfig[i]}`);
              break;
            case "syslog":
              if (pConfig[i]) oCmdArgs.push("--syslog");
              break;
            case "table":
              if (pConfig[i]) oCmdArgs.push("--table");
              break;
            case "tee":
              oCmdArgs.push(`--tee=${pConfig[i]}`);
              break;
            case "tls_ciphersuites":
              oCmdArgs.push(`--tls-ciphersuites=${pConfig[i]}`);
              break;
            case "tls_version":
              oCmdArgs.push(`--tls-version=${pConfig[i]}`);
              break;
            case "unbuffered":
              if (pConfig[i]) oCmdArgs.push("--unbuffered");
              break;
            case "user":
              oCmdArgs.push(`--user=${pConfig[i]}`);
              break;
            case "vertical":
              if (pConfig[i]) oCmdArgs.push("--vertical");
              break;
            case "wait":
              if (pConfig[i]) oCmdArgs.push("--wait");
              break;
            case "xml":
              if (pConfig[i]) oCmdArgs.push("--xml");
              break;
            default:
              // TODO
              break;
          }
          // console.log('i=' + i + ', config=' + pConfig[i]);
        }
        let oDBName = pConfig["db_name"];
        if (oDBName.indexOf("{{") >= 0) {
          const oDBNames = this._evaluate(oDBName, pContext);
          if (oDBNames && oDBNames.length > pTemplateIndex) {
            oDBName = oDBNames[pTemplateIndex];
          }
          // TODO: else, log????
        }
        oCmdArgs.push(oDBName);
        // oCmdArgs.push( pKey );
        // TODO: if "table_name" given in config, maybe rename file before running mysqlimport command...or so a "ln -s" maybe???
        const oEnsureFolderExists =
          '[ ! -d $(dirname "' +
          pKey +
          '") ] && mkdir -p $(dirname "' +
          pKey +
          '");';
        const oCmd =
          oEnsureFolderExists + "/usr/bin/mysql " + oCmdArgs.join(" ");
        pExecutor.exec(oCmd, { context: pKey }, function(
          error,
          stdout,
          stderr
        ) {
          const data: Data = {
            error: error,
            exit: false,
            pass: true,
            _stdout: stdout,
            _stderr: stderr
          };
          let func = null;

          LOGGER.debug("[%s] Done executing mysql.", pParent);
          if (error) {
            LOGGER.error("[%s] Error executing mysql.", pParent, error);
            // reject( error );
            // if ( pConfig['exit_on_failure'] ) data.exit = true;
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
        // reject( e );
        const data: Data = {
          error: e,
          exit: false,
          pass: true
        };
        LOGGER.error("[%s] Unexpected error running mysqlimport.", pParent, e);
        asPromised(pPreviousData, pKey, reject, data);
      }
    });
  }
  handle(pParams: ModParameters): Promise<ModResult<MySQLState>> {
    return new Promise((resolve, reject) => {
      LOGGER.info("[%s] Processing mysqls...", pParams.parent);
      try {
        const oData = { mysqls: {} };
        const oPromises: ((res: any) => Promise<any>)[] = [];
        Object.keys(pParams.config).forEach(i => {
          const oConfig = pParams.config[i];
          let oKeys: string[] = [i];
          if (i.includes("{{")) {
            const v = this._evaluate(i, pParams.context);
            if (v) oKeys = v;
          }
          oKeys.forEach((e, j) => {
            const oOptions = this._readOptions(
              pParams.parent,
              e,
              oConfig,
              pParams.executor,
              pParams.context,
              j
            );
            oPromises.push(
              this._wrapRun(
                pParams.parent,
                e,
                oOptions,
                pParams.executor,
                pParams.context,
                j
              )
            );

            // var oOptions = that._read_options( pParent, i, pConfig[i] );
            // oPromises.push( that._wrap_run( pParent, i, oOptions, pExecutor, pContext ) );
          });
        });

        Promises.seq(oPromises, oData).then(
          function(_pData) {
            LOGGER.info("[%s] Done running mysqls.", pParams.parent);
            resolve({
              status: ModStatus.CONTINUE,
              state: oData
            });
          },
          function(pError) {
            LOGGER.error("[%s] Error running mysqls.", pParams.parent, pError);
            reject(pError);
          }
        );
      } catch (e) {
        LOGGER.error(
          "[%s] Unexpected error running mysqls.",
          pParams.parent,
          e
        );
        reject(e);
      }
    });
  }
}
