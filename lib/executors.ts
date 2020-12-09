import { ISSHClient, SSHClient } from "./ssh-client";
import * as Fs from "fs";
import * as childProcess from "child_process";
import { createLogger } from "./logger";
import { platform } from "os";

const LOCAL_LOGGER = createLogger("etljs::executors::local");
const REMOTE_LOGGER = createLogger("etljs::executors::remote");

export type Callback = (
  error?: Error | null, // child_process.ExecException | null,
  stdout?: string | null,
  stderr?: string | null
) => void;

export interface Executor {
  ready(): Promise<void>;
  exec(pCmd: string, pCmdOptions: any, pCallback: Callback): void;
  writeFile(pFilename: string, pContent: any, pCallback: Callback): void;
  os(): string;
}

export class NoOpExecutor implements Executor {
  ready(): Promise<void> {
    return Promise.resolve();
  }
  exec(_pCmd: string, _pCmdOptions: any, pCallback: Callback): void {
    pCallback(null, "", null);
  }
  writeFile(_pFilename: string, _pContent: any, pCallback: Callback): void {
    pCallback(null, "", null);
  }
  os(): string {
    return platform();
  }
}

export class Local implements Executor {
  mSettings: any;

  constructor(pSettings?: any) {
    this.mSettings = pSettings;
  }
  ready(): Promise<void> {
    return Promise.resolve();
  }
  exec(pCmd: string, pCmdOptions: any, pCallback: Callback): void {
    LOCAL_LOGGER.debug("Executing command [%s] locally...", pCmd);
    childProcess.exec(pCmd, pCmdOptions, function(
      error: childProcess.ExecException | null,
      stdout: string,
      stderr: string
    ) {
      LOCAL_LOGGER.debug("Done executing command [%s] locally.", pCmd);
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
        LOCAL_LOGGER.error(
          "Error writing content to local file [%s].",
          pFilename,
          err
        );
        pCallback(err, "", "");
      } else {
        LOCAL_LOGGER.debug(
          "Successfully wrote content to local file [%s].",
          pFilename
        );
        pCallback(null, "", "");
      }
    });
  }
  os(): string {
    return platform();
  }
}

export class Remote {
  mSettings: any;
  mOS: string;
  mSSHClient: ISSHClient;
  constructor(pSettings: any) {
    this.mSettings = pSettings;
    this.mOS = pSettings.os || "NA";
    this.mSSHClient = pSettings.sshClient || new SSHClient();
  }
  ready(): Promise<void> {
    if (this.mOS === "NA") {
      return this._detectOS();
    } else {
      return Promise.resolve();
    }
  }
  _detectOS(): Promise<void> {
    // var cmd = "uname -a";
    const cmd = "echo -n $OSTYPE";
    return new Promise((resolve, reject) => {
      REMOTE_LOGGER.debug("Detecting OS...");
      this.exec(cmd, {}, (err, stdout, _stderr) => {
        if (err) {
          REMOTE_LOGGER.error("Error detecting os.", err);
          reject(err);
        } else {
          stdout = stdout ? stdout.replace(/[\n\r]+/g, "") : "";
          // const osType=(stdout || "").toLowerCase();
          if (stdout === "" || stdout === "-n $OSTYPE") {
            // Try Windows
            REMOTE_LOGGER.debug("Checking Windows...");
            this.exec("systeminfo", {}, (err, stdout, stderr) => {
              if (err) {
                REMOTE_LOGGER.error(
                  "Error detecting os (while checking Windows). Stderr=[" +
                    stderr +
                    "]",
                  err
                );
                reject(err);
              } else {
                const osName = new RegExp(/OS Name:(.*)/).exec(stdout || "");
                if (osName && osName.length > 1) {
                  const os = osName[1].replace("Microsoft", "").trim();
                  REMOTE_LOGGER.debug("Found Windows: [" + os + "]");
                  this.mOS = os;
                } else {
                  REMOTE_LOGGER.error(
                    "Problem detected Windows version. Will set OS to Windows without version. Stdout=[" +
                      stdout +
                      "]"
                  );
                  this.mOS = "Windows";
                }
                resolve();
              }
            });
          } else {
            const os = stdout.trim();
            REMOTE_LOGGER.debug("Detected Linux/Unix/Mac: [" + os + "]");
            this.mOS = os;
            resolve();
          }
        }
      });
    });
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
    REMOTE_LOGGER.debug(
      "Executing command [%s] remotely on [%s]...",
      pCmd,
      this.mSettings.host
    );

    const opts = this._getSshOpts();

    if (pCmdOptions["env"]) opts["env"] = pCmdOptions["env"];
    let oCmd = pCmd;
    if (pCmdOptions["cwd"]) {
      oCmd = "cd " + pCmdOptions["cwd"] + "; " + oCmd;
      REMOTE_LOGGER.debug(
        "Changing directory. New command to execute remotely: [%s]",
        oCmd
      );
    }
    REMOTE_LOGGER.info("Cmd=%s", oCmd);
    REMOTE_LOGGER.debug("Opts=%j", opts);
    this.mSSHClient.exec(opts, oCmd, function(
      err,
      stdout,
      stderr,
      _server,
      conn
    ) {
      try {
        stdout = Buffer.isBuffer(stdout) ? stdout.toString("utf8") : stdout;
        stderr = Buffer.isBuffer(stderr) ? stderr.toString("utf8") : stderr;
        REMOTE_LOGGER.debug("Command [%s] executed remotely.", pCmd);
        pCallback(err, stdout, stderr);
      } finally {
        if (conn) {
          conn.end();
        }
      }
    });
  }
  writeFile(pFilename: string, pContent: any, pCallback: Callback): void {
    REMOTE_LOGGER.debug("Writing content to remote file [%s]...", pFilename);
    const opts = this._getSshOpts();
    this.mSSHClient.writeFile(opts, pFilename, pContent, function(
      err,
      stdout,
      stderr,
      _server,
      conn
    ) {
      try {
        if (err) {
          REMOTE_LOGGER.error(
            "Error writing content to remote file [%s].",
            pFilename,
            err
          );
          pCallback(err, "", "");
        } else {
          REMOTE_LOGGER.debug(
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
  os(): string {
    // throw new Error("Not yet implemented.");
    return this.mOS;
  }
}
