import { SSHClient } from "./ssh-client";
import * as Fs from "fs";
import * as childProcess from "child_process";
import { createLogger } from "./logger";

const LOGGER = createLogger("etljs::main");
const SSH_CLIENT = new SSHClient();

export type Callback = (
  error?: Error | null, // child_process.ExecException | null,
  stdout?: string | null,
  stderr?: string | null
) => void;

export interface Executor {
  exec(pCmd: string, pCmdOptions: any, pCallback: Callback): void;
  writeFile(pFilename: string, pContent: any, pCallback: Callback): void;
}

export class NoOpExecutor implements Executor {
  exec(_pCmd: string, _pCmdOptions: any, _pCallback: Callback): void {
    // nop
  }
  writeFile(_pFilename: string, _pContent: any, _pCallback: Callback): void {
    // nop
  }
}

export class Local implements Executor {
  mSettings: any;

  constructor(pSettings?: any) {
    this.mSettings = pSettings;
  }
  exec(pCmd: string, pCmdOptions: any, pCallback: Callback): void {
    LOGGER.debug("Executing command [%s] locally...", pCmd);
    childProcess.exec(pCmd, pCmdOptions, function(
      error: childProcess.ExecException | null,
      stdout: string,
      stderr: string
    ) {
      LOGGER.debug("Done executing command [%s] locally.", pCmd);
      stdout = Buffer.isBuffer(stdout) ? stdout.toString("utf8") : stdout;
      stderr = Buffer.isBuffer(stderr) ? stderr.toString("utf8") : stderr;
      pCallback(error, stdout, stderr);
    });
  }
  writeFile(pFilename: string, pContent: any, pCallback: Callback): void {
    Fs.writeFile(pFilename, pContent, function(
      err: NodeJS.ErrnoException | null
    ) {
      if (err) {
        LOGGER.error(
          "Error writing content to local file [%s].",
          pFilename,
          err
        );
        pCallback(err, "", "");
      } else {
        LOGGER.debug(
          "Successfully wrote content to local file [%s].",
          pFilename
        );
        pCallback(null, "", "");
      }
    });
  }
}

export class Remote {
  mSettings: any;

  constructor(pSettings: any) {
    this.mSettings = pSettings;
  }
  _getSshOpts(): any {
    const opts: any = {
      host: this.mSettings.host, // e.g. '192.168.99.100',
      port: this.mSettings.port || 22,
      username: this.mSettings.username
    };
    if (this.mSettings["privateKey"]) {
      opts["privateKey"] = this.mSettings["privateKey"];
    } else if (this.mSettings["password"]) {
      opts["password"] = this.mSettings["password"];
    }

    return opts;
  }
  exec(pCmd: string, pCmdOptions: any, pCallback: Callback): void {
    LOGGER.debug(
      "Executing command [%s] remotely on [%s]...",
      pCmd,
      this.mSettings.host
    );

    const opts = this._getSshOpts();

    if (pCmdOptions["env"]) opts["env"] = pCmdOptions["env"];
    let oCmd = pCmd;
    if (pCmdOptions["cwd"]) {
      oCmd = "cd " + pCmdOptions["cwd"] + "; " + oCmd;
      LOGGER.debug(
        "Changing directory. New command to execute remotely: [%s]",
        oCmd
      );
    }
    LOGGER.info("Cmd=%s", oCmd);
    LOGGER.debug("Opts=%j", opts);
    SSH_CLIENT.exec(opts, oCmd, function(err, stdout, stderr, _server, conn) {
      try {
        stdout = Buffer.isBuffer(stdout) ? stdout.toString("utf8") : stdout;
        stderr = Buffer.isBuffer(stderr) ? stderr.toString("utf8") : stderr;
        LOGGER.debug("Command [%s] executed remotely.", pCmd);
        pCallback(err, stdout, stderr);
      } finally {
        if (conn) {
          conn.end();
        }
      }
    });
  }
  writeFile(pFilename: string, pContent: any, pCallback: Callback): void {
    LOGGER.debug("Writing content to remote file [%s]...", pFilename);
    const opts = this._getSshOpts();
    SSH_CLIENT.writeFile(opts, pFilename, pContent, function(
      err,
      stdout,
      stderr,
      _server,
      conn
    ) {
      try {
        if (err) {
          LOGGER.error(
            "Error writing content to remote file [%s].",
            pFilename,
            err
          );
          pCallback(err, "", "");
        } else {
          LOGGER.debug(
            "Successfully wrote content to remote file [%s].",
            pFilename
          );
          pCallback(null, stdout, stderr);
        }
      } finally {
        if (conn) {
          conn.end();
        }
      }
    });
  }
}
