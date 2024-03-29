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

const LOGGER: Logger = createLogger("etljs::mods::mysqls");

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
  mysqls: {
    [key: string]: Data;
  };
};

export type MySQLOptions = {
  // eslint-disable-next-line camelcase
  auto_rehash?: boolean;
  // eslint-disable-next-line camelcase
  auto_vertical_output?: boolean;
  batch?: boolean;
  // eslint-disable-next-line camelcase
  bind_address?: string;
  // eslint-disable-next-line camelcase
  binary_as_hex?: boolean;
  // eslint-disable-next-line camelcase
  binary_mode?: boolean;
  // eslint-disable-next-line camelcase
  character_sets_dir?: string;
  // eslint-disable-next-line camelcase
  column_names?: boolean;
  // eslint-disable-next-line camelcase
  column_type_info?: boolean;
  comments?: boolean;
  columns?: boolean;
  compress?: boolean;
  // eslint-disable-next-line camelcase
  connect_expired_password?: boolean;
  // eslint-disable-next-line camelcase
  connect_timeout?: number;
  // eslint-disable-next-line camelcase
  // db_name?: string; // not really a mysql option but using it here.
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
  delimiter?: string;
  // eslint-disable-next-line camelcase
  enable_cleartext_plugin?: boolean;
  execute?: string;
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
  html?: boolean;
  // eslint-disable-next-line camelcase
  ignore_spaces?: boolean;
  // eslint-disable-next-line camelcase
  line_numbers?: boolean;
  // eslint-disable-next-line camelcase
  local_infile?: boolean;
  // eslint-disable-next-line camelcase
  max_allowed_packet?: string;
  // eslint-disable-next-line camelcase
  max_join_size?: number;
  // eslint-disable-next-line camelcase
  named_commands?: boolean;
  // eslint-disable-next-line camelcase
  net_buffer_length?: string;
  // eslint-disable-next-line camelcase
  no_auto_rehash?: boolean;
  // eslint-disable-next-line camelcase
  no_beep?: boolean;
  // eslint-disable-next-line camelcase
  one_database?: boolean;
  pager?: string;
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
  quick?: boolean;
  raw?: boolean;
  reconnect?: boolean;
  // eslint-disable-next-line camelcase
  i_am_a_dummy?: boolean;
  // eslint-disable-next-line camelcase
  safe_updates?: boolean;
  // eslint-disable-next-line camelcase
  select_limit?: number;
  // eslint-disable-next-line camelcase
  show_warnings?: boolean;
  // eslint-disable-next-line camelcase
  sigint_ignore?: boolean;
  // eslint-disable-next-line camelcase
  skip_auto_rehash?: boolean;
  // eslint-disable-next-line camelcase
  skip_column_names?: boolean;
  // eslint-disable-next-line camelcase
  skip_line_numbers?: boolean;
  // eslint-disable-next-line camelcase
  skip_named_commands?: boolean;
  // eslint-disable-next-line camelcase
  skip_pager?: boolean;
  // eslint-disable-next-line camelcase
  skip_reconnect?: boolean;
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
  syslog?: boolean;
  table?: boolean;
  tee?: string;
  // eslint-disable-next-line camelcase
  tls_ciphersuites?: string;
  unbuffered?: boolean;
  vertical?: boolean;
  wait?: boolean;
  xml?: boolean;
  // eslint-disable-next-line camelcase
  tls_cipheruites?: string;
  // eslint-disable-next-line camelcase
  tls_version?: string;
  // eslint-disable-next-line camelcase
  use_threads?: boolean;
  user?: string;
  // CUSTOM options
  output?: string; // to store output into file
  var?: string; // to store output into variable
};

export type MySQLOptionsWithDBName = MySQLOptions & {
  // eslint-disable-next-line camelcase
  db_name: string;
};

export type MySQLSettings =
  | ModSettings
  | {
      [key: string]: MySQLOptions;
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
const _trimLastLineBreak = function(pValue: any): any {
  if (pValue && (typeof pValue === "string" || pValue instanceof String)) {
    if (pValue.endsWith("\n") || pValue.endsWith("\r")) {
      return pValue.replace(/(\r\n|\n|\r)$/, "");
    }
  }
  return pValue;
};

export default class MySQLsMod extends AbstractMod<MySQLState, MySQLSettings> {
  mSettings: any;
  constructor(pSettings?: MySQLSettings) {
    super("mysqls", pSettings);
    super.templateEngine = new TemplateEngine();
  }
  _applySettingsOld(
    pParent: string,
    pKey: string,
    pConfig: MySQLOptions
  ): void {
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
        LOGGER.debug("Applying settings with key: " + pKey);
        applySettings(pConfig, this.mSettings.settings[pKey]);
      } else if (this.mSettings.settings[pParent]) {
        LOGGER.debug("Applying settings with parent: " + pParent);
        applySettings(pConfig, this.mSettings.settings[pParent]);
      } else if (this.mSettings.settings["*"]) {
        LOGGER.debug("Applying settings with *");
        applySettings(pConfig, this.mSettings.settings["*"]);
      }
    }
  }
  _applySettings(pParent: string, pKey: string, pConfig: any): void {
    const applySettings = function(pConfig: any, pSettings: any): void {
      for (const i in pSettings) {
        if (pConfig[i] == null) pConfig[i] = pSettings[i];
      }
    };
    if (this.mSettings[pKey]) applySettings(pConfig, this.mSettings[pKey]);
    else if (this.mSettings[pParent]) {
      applySettings(pConfig, this.mSettings[pParent]);
    } else if (this.mSettings["*"]) {
      applySettings(pConfig, this.mSettings["*"]);
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
      raw: null,
      replace: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      secure_auth: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      server_public_key_path: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      shared_memory_base_name: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      skip_column_names: null,
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
    pConfig: MySQLOptionsWithDBName,
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
    pConfig: MySQLOptionsWithDBName,
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
        let output: string | null = null;
        (Object.keys(pConfig) as (keyof MySQLOptionsWithDBName)[]).forEach(
          i => {
            // for (const i in pConfig) {
            if (pConfig[i] === null || pConfig[i] === undefined) return;
            const rawValue = pConfig[i];
            let value = rawValue;
            if (typeof value === "string") {
              value =
                super.evaluateSingle(
                  rawValue as string,
                  pContext,
                  pTemplateIndex
                ) || rawValue;
            }
            switch (i) {
              case "auto_rehash":
                if (value) oCmdArgs.push("--auto-rehash");
                break;
              case "auto_vertical_output":
                if (value) oCmdArgs.push("--auto-vertical-output");
                break;
              case "batch":
                if (value) oCmdArgs.push("--batch");
                break;
              case "binary_as_hex":
                if (value) oCmdArgs.push("--binary-as-hex");
                break;
              case "binary_mode":
                if (value) oCmdArgs.push("--binary-mode");
                break;
              case "bind_address":
                oCmdArgs.push(`--bind-address=${value}`);
                break;
              case "character_sets_dir":
                oCmdArgs.push(`--character-sets-dir=${value}`);
                break;
              case "column_names":
                oCmdArgs.push(`--columns=${value}`);
                break;
              case "column_type_info":
                if (value) oCmdArgs.push("--column-type-info");
                break;
              case "comments":
                if (value) oCmdArgs.push("--comments");
                break;
              case "compress":
                if (value) oCmdArgs.push("--compress");
                break;
              case "connect_expired_password":
                if (value) oCmdArgs.push("--connect-expired-password");
                break;
              case "connect_timeout":
                oCmdArgs.push(`--connect_timeout=${value}`);
                break;
              // case "database":
              case "debug":
                oCmdArgs.push(`--debug=${value}`);
                break;
              case "debug_check":
                if (value) oCmdArgs.push("--debug-check");
                break;
              case "debug_info":
                if (value) oCmdArgs.push("--debug-info");
                break;
              case "default_auth":
                oCmdArgs.push(`--default-auth=${value}`);
                break;
              case "default_character_set":
                oCmdArgs.push(`--default-character-set=${value}`);
                break;
              case "defaults_extra_file":
                oCmdArgs.push(`--defaults-extra-file=${value}`);
                break;
              case "defaults_file":
                oCmdArgs.push(`--defaults-file=${value}`);
                break;
              case "defaults_group_suffix":
                oCmdArgs.push(`--defaults-group-suffix=${value}`);
                break;
              case "delimiter":
                oCmdArgs.push(`--delimiter=${value}`);
                break;
              case "enable_cleartext_plugin":
                if (value) oCmdArgs.push("--enable-cleartext-plugin");
                break;
              case "execute": {
                if (value !== null) {
                  oCmdArgs.push(
                    "--execute='" + escapeSingleQuotes(value as string) + "'"
                  );
                }
                break;
              }
              case "force":
                if (value) oCmdArgs.push("--force");
                break;
              case "get_server_public_key":
                if (value) oCmdArgs.push("--get-server-public-key");
                break;
              case "host":
                oCmdArgs.push("--host=" + value);
                break;
              case "html":
                if (value) oCmdArgs.push("--html");
                break;
              case "ignore_spaces":
                if (value) oCmdArgs.push("--ignore-spaces");
                break;
              // case "init_command":
              case "line_numbers":
                if (value) oCmdArgs.push("--line-numbers");
                break;
              case "local_infile":
                oCmdArgs.push(`--local-infile=${value}`);
                break;
              case "login_path":
                oCmdArgs.push(`--login-path=${value}`);
                break;
              case "max_allowed_packet":
                oCmdArgs.push(`--max_allowed_packet=${value}`);
                break;
              case "max_join_size":
                oCmdArgs.push(`--max_join_size=${value}`);
                break;
              case "named_commands":
                if (value) oCmdArgs.push("--named-commands");
                break;
              case "net_buffer_length":
                oCmdArgs.push(`--net_buffer_length=${value}`);
                break;
              case "no_auto_rehash":
                if (value) oCmdArgs.push("--no-auto-rehash");
                break;
              case "no_beep":
                if (value) oCmdArgs.push("--no-beep");
                break;
              case "no_defaults":
                if (value) oCmdArgs.push("--no-defaults");
                break;
              case "one_database":
                if (value) oCmdArgs.push("--one-database");
                break;
              case "output":
                // eslint-disable-next-line no-case-declarations
                output = value as string;
                break;
              case "pager":
                oCmdArgs.push(`--pager=${value}`);
                break;
              case "password":
                oCmdArgs.push(`--password=${value}`);
                break;
              case "pipe":
                if (value) oCmdArgs.push("--pipe");
                break;
              case "plugin_dir":
                oCmdArgs.push(`--plugin-dir=${value}`);
                break;
              case "port":
                oCmdArgs.push(`--port=${value}`);
                break;
              // case "print-defaults":
              // case "prompt": // ???
              case "protocol":
                oCmdArgs.push(`--protocol=${value}`);
                break;
              case "quick":
                if (value) oCmdArgs.push("--quick");
                break;
              case "raw":
                if (value) oCmdArgs.push("--raw");
                break;
              case "reconnect":
                if (value) oCmdArgs.push("--reconnect");
                break;
              case "i_am_a_dummy":
                if (value) oCmdArgs.push("--i-am-a-dummy");
                break;
              case "safe_updates":
                if (value) oCmdArgs.push("--safe-updates");
                break;
              case "secure_auth":
                if (value) oCmdArgs.push("--secure-auth");
                break;
              case "select_limit":
                oCmdArgs.push(`--select_limit=${value}`);
                break;
              case "server_public_key_path":
                oCmdArgs.push(`--server-public-key-path=${value}`);
                break;
              case "shared_memory_base_name":
                oCmdArgs.push(`--shared-memory-base-name=${value}`);
                break;
              case "show_warnings":
                if (value) oCmdArgs.push("--show-warnings");
                break;
              case "sigint_ignore":
                if (value) oCmdArgs.push("--sigint-ignore");
                break;
              case "silent":
                if (value) oCmdArgs.push("--silent");
                break;
              case "skip_auto_rehash":
                if (value) oCmdArgs.push("--skip-auto-rehash");
                break;
              case "skip_column_names":
                if (value) oCmdArgs.push("--skip-column-names");
                break;
              case "skip_line_numbers":
                if (value) oCmdArgs.push("--skip-line-numbers");
                break;
              case "skip_named_commands":
                if (value) oCmdArgs.push("--skip-named-commands");
                break;
              case "skip_pager":
                if (value) oCmdArgs.push("--skip-pager");
                break;
              case "skip_reconnect":
                if (value) oCmdArgs.push("--skip-reconnect");
                break;
              case "socket":
                oCmdArgs.push(`--socket=${value}`);
                break;
              case "ssl_ca":
                oCmdArgs.push(`--ssl-ca=${value}`);
                break;
              case "ssl_capath":
                oCmdArgs.push(`--ssl-capath=${value}`);
                break;
              case "ssl_cert":
                oCmdArgs.push(`--ssl-cert=${value}`);
                break;
              case "ssl_cipher":
                oCmdArgs.push(`--ssl-cipher=${value}`);
                break;
              case "ssl_crl":
                oCmdArgs.push(`--ssl-crl=${value}`);
                break;
              case "ssl_crlpath":
                oCmdArgs.push(`--ssl-crlpath=${value}`);
                break;
              case "ssl_fips_mode":
                oCmdArgs.push(`--ssl-fips_mode=${value}`);
                break;
              case "ssl_key":
                oCmdArgs.push(`--ssl-key=${value}`);
                break;
              case "ssl_mode":
                oCmdArgs.push(`--ssl-mode=${value}`);
                break;
              case "syslog":
                if (value) oCmdArgs.push("--syslog");
                break;
              case "table":
                if (value) oCmdArgs.push("--table");
                break;
              case "tee":
                oCmdArgs.push(`--tee=${value}`);
                break;
              case "tls_ciphersuites":
                oCmdArgs.push(`--tls-ciphersuites=${value}`);
                break;
              case "tls_version":
                oCmdArgs.push(`--tls-version=${value}`);
                break;
              case "unbuffered":
                if (value) oCmdArgs.push("--unbuffered");
                break;
              case "user":
                oCmdArgs.push(`--user=${value}`);
                break;
              case "vertical":
                if (value) oCmdArgs.push("--vertical");
                break;
              case "wait":
                if (value) oCmdArgs.push("--wait");
                break;
              case "xml":
                if (value) oCmdArgs.push("--xml");
                break;
              default:
                break;
            }
            // console.log('i=' + i + ', config=' + pConfig[i]);
          }
        );
        // must be last
        let oDBName = pConfig["db_name"];
        oDBName =
          super.evaluateSingle(oDBName, pContext, pTemplateIndex) || oDBName;
        oCmdArgs.push(oDBName);
        let oCmd = "/usr/bin/mysql " + oCmdArgs.join(" ");
        // oCmdArgs.push( pKey );
        // TODO: if "table_name" given in config, maybe rename file before running mysqlimport command...or so a "ln -s" maybe???
        if (output) {
          const oEnsureFolderExists = `[ ! -d $(dirname "${pKey}") ] && mkdir -p $(dirname "${pKey}");`;
          oCmd = oEnsureFolderExists + oCmd;
        }

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

          if (pConfig["var"]) {
            const oVarKey = pConfig["var"];
            LOGGER.debug(
              "[%s] Saving result of mysql [%s] to var [%s].",
              pParent,
              pKey,
              oVarKey
            );
            const varResult = _trimLastLineBreak(data.result);
            pContext.vars[oVarKey] = varResult;
          }

          asPromised(pPreviousData, pKey, func, data);
        });
      } catch (e) {
        // reject( e );
        const data: Data = {
          error: e as Error,
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
          const oConfig = pParams.config[i] as MySQLOptionsWithDBName;
          const oKeys: string[] = super.evaluate(i, pParams.context) || [i];
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

        Promises.seq(oPromises, oData)
          .then(function(_pData) {
            LOGGER.info("[%s] Done running mysqls.", pParams.parent);
            resolve({
              status: ModStatus.CONTINUE,
              state: oData
            });
          })
          .catch(pError => {
            LOGGER.error("[%s] Error running mysqls.", pParams.parent, pError);
            reject(pError);
          });
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
