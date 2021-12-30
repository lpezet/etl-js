import { AbstractMod, ModParameters, ModResult, ModStatus } from "../mod";
import TemplateEngine from "../templating/engine";
import * as util from "util";
import * as Promises from "../promises";
import Context from "../context";
import { Executor } from "../executors";
import { Logger, createLogger } from "../logger";

const LOGGER: Logger = createLogger("etljs::mods::commands");

export type Data = {
  error?: Error;
  result?: any;
  message?: string;
  exit: boolean;
  pass: boolean;
  skip: boolean;
  _stdout?: string | null;
  _stderr?: string | null;
};

export type CommandsState = {
  results: any[];
};

const CHAIN_EVAL = function(pValue: ModResult<CommandsState>): boolean {
  /*
  const oResults = pValue["results"];
  for (let i = oResults.length - 1; i >= 0; i--) {
    if (oResults[i]["exit"] || oResults[i]["skip"]) return true;
  }
  */
  return pValue.status == ModStatus.EXIT || pValue.status == ModStatus.STOP;
  // return false;
};

// export default class CommandsMod implements Mod {
export default class CommandsMod extends AbstractMod<CommandsState, any> {
  constructor(pSettings?: any) {
    super("commands", pSettings || {});
    super.templateEngine = new TemplateEngine();
  }
  _singleExec(
    pParent: string,
    pKey: string,
    pSpecs: any,
    pExecutor: Executor,
    pContext: Context,
    pTemplateIndex: number
  ): (data: ModResult<CommandsState>) => Promise<ModResult<CommandsState>> {
    return (pPreviousData: ModResult<CommandsState>): Promise<any> => {
      return new Promise((resolve, reject) => {
        const asPromised = function(
          pFunc: (any?: any) => void,
          pData: any
        ): void {
          LOGGER.debug("[%s] Command [%s] results:\n%j", pParent, pKey, pData);
          // if ( ! pPreviousData.commands[pKey] ) pPreviousData.commands[pKey] = {};
          // pPreviousData.commands[pKey] = data;
          const data = {
            command: pKey,
            results: pData,
            exit: Boolean(pData["exit"]),
            skip: Boolean(pData["skip"])
          };
          // data[ pKey ] = pData;
          if (pData["exit"]) pPreviousData.status = ModStatus.EXIT;
          if (pData["skip"]) pPreviousData.status = ModStatus.STOP;
          // pPreviousData.exit = pPreviousData.exit || Boolean(pData["exit"]);
          // pPreviousData.skip = pPreviousData.skip || Boolean(pData["skip"]);
          pPreviousData.state?.results.push(data);
          pFunc(pPreviousData);
        };

        const oCmdSpecs = pSpecs;
        // try {
        LOGGER.debug("[%s] Executing command [%s]...", pParent, pKey);
        let oCwd = oCmdSpecs["cwd"];
        oCwd = super.evaluateSingle(oCwd, pContext, pTemplateIndex);

        let oTest = oCmdSpecs["test"];
        oTest = super.evaluateSingle(oTest, pContext, pTemplateIndex);

        if (Array.isArray(oTest)) oTest = oTest[0];
        let oCmd = oCmdSpecs["command"];
        oCmd = super.evaluateSingle(oCmd, pContext, pTemplateIndex);

        if (Array.isArray(oCmd)) oCmd = oCmd[0];
        const oEnv = oCmdSpecs["env"];

        const oCmdOptions: any = {};
        oCmdOptions["context"] = pKey;
        if (oCwd) oCmdOptions["cwd"] = oCwd;

        if (oEnv) {
          oCmdOptions["env"] = {};
          Object.keys(oEnv).forEach(k => {
            oCmdOptions["env"][k] = oEnv[k];
          });
        }

        const execCommand = function(
          pCmd: string,
          pCmdOptions: any
        ): Promise<any> {
          return new Promise(function(resolve, reject) {
            const data: Data = {
              exit: false,
              pass: true,
              skip: false
            };
            try {
              LOGGER.debug(
                "[%s] Running command: [%s] with options [%j]",
                pParent,
                pCmd,
                pCmdOptions
              );
              pExecutor.exec(pCmd, pCmdOptions, function(
                error,
                stdout,
                stderr
              ) {
                if (error) data.error = error;
                data._stdout = stdout;
                data._stderr = stderr;
                LOGGER.debug(
                  "[%s] Command [%s] executed. Error? %s (code=%s), Stderr? %s, Stdout? %s",
                  pParent,
                  pKey,
                  !!error,
                  error ? error.code : "NA",
                  !!stderr,
                  !!stdout
                );
                // if (error) console.log(error.code);
                if (error) {
                  LOGGER.error(
                    "[%s] Command [%s] exited.",
                    pParent,
                    pKey,
                    error
                  );
                  // reject( util.format.apply(null, [ '[%s] Command [%s] exited with code %s: %s.', pParent, pKey, error.code, error ] ));
                  data.result = stderr;
                  data.message = util.format.apply(null, [
                    "[%s] Command [%s] exited.",
                    pParent,
                    pKey,
                    error
                  ]);
                  if (oCmdSpecs["ignore_errors"]) {
                    resolve(data);
                  } else {
                    reject(data);
                  }
                } else {
                  LOGGER.debug("[%s] Command [%s] completed.", pParent, pKey);
                  // resolve( stdout );
                  data.result = stdout;
                  if (oCmdSpecs["result_as_json"] === true) {
                    try {
                      data.result = JSON.parse(stdout || "{}");
                    } catch (e) {
                      LOGGER.warn(
                        "[%s] Error with command [%s]. Could not parse stdout as JSON: [%s] not a valid JSON string.",
                        pParent,
                        pKey,
                        stdout
                      );
                    }
                  }

                  if (oCmdSpecs["var"]) {
                    const oVarKey = pSpecs["var"];
                    LOGGER.debug(
                      "[%s] Saving result of command [%] to var [%s].",
                      pParent,
                      pKey,
                      oVarKey
                    );
                    pContext.vars[oVarKey] = data.result;
                  }

                  resolve(data);
                }
              });
            } catch (e) {
              LOGGER.error(
                "[%s] Unexpected error executing command: [%s] with options [%s]",
                pParent,
                pCmd,
                pCmdOptions
              );
              data.error = e as Error;
              if (oCmdSpecs["ignore_errors"]) {
                resolve(data);
              } else {
                reject(data);
              }
            }
          });
        };

        const execTest = function(pTest: string): Promise<any> {
          LOGGER.info("[%s] Testing for command [%s]...", pParent, pKey);
          const oTest = "(" + pTest + ') && echo "continue" || echo "stop"';
          return new Promise(function(resolve, reject) {
            const data: Data = {
              exit: false,
              skip: false,
              pass: false
            };
            pExecutor.exec(oTest, { context: pKey }, function(
              error,
              stdout,
              stderr
            ) {
              if (error) data.error = error;
              data._stdout = stdout;
              data._stderr = stderr;
              let func = null;
              try {
                if (error) {
                  LOGGER.error(
                    "[%s] Test failed for command [%s]. Skipping command.",
                    pParent,
                    pKey,
                    error
                  );
                  if (oCmdSpecs["exit_on_test_failed"]) data.exit = true;
                  if (oCmdSpecs["skip_on_test_failed"]) data.skip = true;
                  func = reject;
                } else {
                  if (!stdout) {
                    LOGGER.error(
                      "[%s] Unexpected test result (stdout=[%s]). Skipping command %s.",
                      pParent,
                      stdout,
                      pKey
                    );
                    if (oCmdSpecs["exit_on_test_failed"]) data.exit = true;
                    if (oCmdSpecs["skip_on_test_failed"]) data.skip = true;
                    func = reject;
                  } else {
                    if (stdout.match(/continue/g)) {
                      LOGGER.info(
                        "[%s] Test passed for command [%s].",
                        pParent,
                        pKey
                      );
                      // resolve();
                      data.pass = true;
                      func = resolve;
                    } else {
                      LOGGER.info(
                        "[%s] Test failed. Skipping command [%s] (exit_on_test_failed=%s).",
                        pParent,
                        pKey,
                        oCmdSpecs["exit_on_test_failed"]
                      );
                      LOGGER.debug(
                        "[%s] Test output for command [%s]: [%s]",
                        pParent,
                        pKey,
                        stdout
                      );
                      // reject( stdout );
                      // var oData = { error: error, exit: false, context: pParent + '..' + pKey };
                      if (oCmdSpecs["exit_on_test_failed"]) data.exit = true;
                      if (oCmdSpecs["skip_on_test_failed"]) data.skip = true;
                      data.pass = false;
                      // reject( oData )
                      func = resolve;
                    }
                  }
                }
              } catch (e) {
                data.error = e as Error;
                if (oCmdSpecs["exit_on_test_failed"]) data.exit = true;
                if (oCmdSpecs["skip_on_test_failed"]) data.skip = true;
                data.pass = false;
                func = reject;
                // func = resolve;
              }
              func(data);
            });
          });
        };

        if (oTest) {
          execTest(oTest)
            .then(
              function(result: any) {
                LOGGER.debug("[%s] After command test...", pParent);
                if (result["pass"]) {
                  LOGGER.debug("...pass=%s", result["pass"]);
                  return execCommand(oCmd, oCmdOptions);
                } else {
                  return Promise.resolve(result);
                }
              },
              function(data) {
                LOGGER.info(
                  "[%s] Error in test. Command [%s] will be skipped.",
                  pParent,
                  pKey
                );
                // return Promise.reject ( error );
                return Promise.resolve(data); // { error: error, pass: false } );
                /*
                          console.log('##### Error from running test command !!!!');
                          if ( error['exit'] ) {
                              console.log('##### After returning from test error, exiting.');
                              asPromised( reject, error);
                          } else {
                              // continue for other commands
                              console.log('##### After returning from test error, NOT exiting.');
                              asPromised( resolve, error);
                          }
                          */
              }
            )
            // .catch( function( pError ) {
            //	LOGGER.info('Unexpected error from test.');
            //	//return Promise.reject ( error );
            //	return Promise.resolve( data ); //{ error: error, pass: false } );
            // })
            .then(
              function(result) {
                // console.log('##### then() after executing command!!!!!');
                if (result["pass"]) {
                  LOGGER.info("[%s] ...command [%s] executed.", pParent, pKey);
                  // console.dir( result );
                } else {
                  LOGGER.debug(
                    "[%s] ...command [%s] skipped (test failed).",
                    pParent,
                    pKey
                  );
                }
                asPromised(resolve, result);
              },
              function(error) {
                // TODO: WARNING: Problem is here, we don't know if it's the Promise.reject() from error from test or error from executing the command itself.
                // console.log('##### error() after executing command!!!!!');
                LOGGER.error(
                  "[%s] Error while executing command [%s].",
                  pParent,
                  pKey,
                  error
                );
                const data = {
                  error: error,
                  result: null,
                  message: null,
                  exit: false
                };
                if (oCmdSpecs["exit_on_error"]) data.exit = true;
                if (oCmdSpecs["ignore_errors"]) {
                  asPromised(resolve, data);
                } else {
                  asPromised(reject, data);
                }
                /*
                          if ( error['exit'] && ! error[] ) {
                              //resolve();
                              asPromised( reject, error);
                          } else {
                              asPromised( resolve, error);
                          }
                          */
              }
            );
        } else {
          LOGGER.info("[%s] ...no test for [%s]...", pParent, pKey);
          execCommand(oCmd, oCmdOptions).then(
            function(result) {
              LOGGER.debug("[%s] ...command [%s] executed.", pParent, pKey);
              // resolve();
              asPromised(resolve, result);
            },
            function(error) {
              LOGGER.error(
                "[%s] Error while executing command [%s].",
                pParent,
                pKey,
                error
              );
              // resolve();
              const data = {
                error: error,
                result: null,
                message: null,
                exit: false
              };
              if (oCmdSpecs["exit_on_error"]) data.exit = true;
              if (oCmdSpecs["ignore_errors"]) {
                asPromised(resolve, data);
              } else {
                asPromised(reject, data);
              }
            }
          );
        }
      });
    };
  }
  _exec(
    pParent: string,
    pKey: string,
    pSpecs: any,
    pExecutor: Executor,
    pContext: Context
  ): (data: any) => Promise<ModResult<CommandsState>> {
    return (
      pPreviousData: ModResult<CommandsState>
    ): Promise<ModResult<CommandsState>> => {
      // console.log('# commands: pPreviousData=');
      // console.log( JSON.stringify( pPreviousData ) );
      // (pPreviousData && pPreviousData.length > 0 && (pPreviousData[ pPreviousData.length - 1 ]['exit'] || pPreviousData[ pPreviousData.length - 1 ]['skip'] ) )
      const oPromises: ((data: any) => Promise<any>)[] = [];
      if (!pKey.includes("{{")) {
        // normal way
        oPromises.push(
          this._singleExec(pParent, pKey, pSpecs, pExecutor, pContext, 0)
        );
      } else {
        const oConfig: any = {};
        oConfig[pKey] = pSpecs;
        const oConfigs = super.evaluateObject(oConfig, pContext);
        LOGGER.debug(
          "[%s] Found tags in command key. Original:\n%j\nAfter reduction:\n%j",
          pParent,
          pSpecs,
          oConfigs
        );
        const oConfigKeys = Object.keys(oConfigs);
        LOGGER.debug(
          "[%s] Running multiple commands for key [%s] (%s in total)...",
          pParent,
          pKey,
          oConfigKeys.length
        );

        oConfigKeys.forEach((e, i) => {
          const oSpecs = oConfigs[e];
          // console.log("#### Running command [" + e + "] with:");
          // console.dir(oSpecs);
          oPromises.push(
            this._singleExec(pParent, e, oSpecs, pExecutor, pContext, i)
          );
        });
      }
      return Promises.chain(oPromises, pPreviousData, CHAIN_EVAL, {
        name: "command_" + pKey,
        logger: LOGGER
      });
      // NOT SURE HERE if we should process the results first before sending it back

      // if ( pPreviousData['exit'] || !pExecutor ) {
      //	return Promise.resolve( pPreviousData );
      // }
      // console.log('commands._exec: PreviousData=');
      // console.dir( pPreviousData );
      // if ( pPreviousData['etl']['exit'] ) {
      //	return Promise.resolve( pPreviousData );
      // } else {

      // }
    };
  }
  handle(pParams: ModParameters): Promise<ModResult<CommandsState>> {
    // pCurrentActivityResult, pGlobalResult, pContext ) {
    // var oTemplateContext = this.mTemplateEngine.create_context( pCurrentActivityResult, pGlobalResult, pContext );
    // var oPromise = new Promise();
    // console.log('commands.handle: data = ');
    // console.dir( pData );
    // console.log('## Commands.handle()....');
    // return new Promise(function(resolve, reject) {
    LOGGER.debug("[%s] Processing commands...", pParams.parent);
    try {
      // var oResults = []; // Should be maybe: { exit: false, skip: false, results: [] } //{ 'commands' : [] };
      const oResult = {
        status: ModStatus.CONTINUE,
        state: { results: [] }
      } as ModResult<any>;
      const oPromises: ((data: any) => Promise<any>)[] = [];
      Object.keys(pParams.config).forEach(i => {
        oPromises.push(
          this._exec(
            pParams.parent,
            i,
            pParams.config[i],
            pParams.executor,
            pParams.context
          )
        );
      });

      // PromiseSeqConcatResults
      // Promises.seqConcatResults( oPromises ).then(function( pData ) {
      // Promises.seq( oPromises, oResults )
      return Promises.chain(oPromises, oResult, CHAIN_EVAL, {
        name: "commands",
        logger: LOGGER
      })
        .then((data: ModResult<CommandsState>) => {
          LOGGER.info("[%s] Done processing commands.", pParams.parent);
          LOGGER.debug("[%s] Results:\n%j", pParams.parent, data);
          // console.log('commands.handle(): data = %j', data);
          // console.dir( data );
          return data;
        })
        .catch(error => {
          LOGGER.error(
            "[%s] Unexpected error running commands.",
            pParams.parent,
            error
          );
          return Promise.reject(error);
        });
    } catch (e) {
      LOGGER.error(
        "[%s] Unexpected error processing commands.",
        pParams.parent,
        e
      );
      return Promise.reject(e);
    }
  }
}

/*
// NB: No starting value
const PromiseSeqConcatResults = (funcs)  =>
funcs.reduce((promise, func) =>
  promise.then(result => func().then(Array.prototype.concat.bind(result))),
  Promise.resolve([]))

const PromiseSeq = (funcs, startingValue) =>
funcs.reduce((promise, func) =>
  promise.then(result => func(result)),
  Promise.resolve(startingValue))
*/
