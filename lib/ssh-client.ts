import * as path from "path";
import { Client } from "ssh2";
import * as Fs from "fs";

type Callback = (
  err: Error | null,
  stdout: string,
  stderr: string,
  server: any,
  conn: Client
) => void;

function ssh2_exec(pClientOpts: any, pCmd: string, pCallback: Callback) {
  let stdout: string;
  let stderr: string;
  let err: Error;
  let code: any;
  //var signal = null;
  let callbackCalled = false;
  let timeoutCallback: any;

  function doCallback(): void {
    if (!err && (stderr || code)) {
      err = new Error(stderr || code);
    }
    if (!callbackCalled) {
      callbackCalled = true;
      if (timeoutCallback) clearInterval(timeoutCallback);
      pCallback(err, stdout, stderr, null, conn);
    }
  }

  const conn = new Client();
  //console.log('ssh2_exec: 1');
  conn
    .on("ready", function () {
      conn.exec(pCmd, function (pErr, stream) {
        if (pErr) {
          err = pErr;
          doCallback();
          //pCallback( err, "", "", null, conn );
          return;
        }

        stream
          .on("close", function (pCode: any) {
            code = pCode;
            //signal = pSignal;
            //console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            doCallback();
          })
          .on("data", function (pData: any) {
            stdout = pData;
          })
          .on("error", function (_pData: any) {
            //console.log('error');
            //TODO
            //stdout = data;
          })
          .on("end", function (_pData: any) {
            //TODO?
            //stdout = data;
          })
          .on("exit", function (_pData: any) {
            //TODO?
            //stdout = data;
          })
          .stderr.on("data", function (pData: any) {
            stderr = pData;
            if (timeoutCallback) clearInterval(timeoutCallback);
            timeoutCallback = setInterval(doCallback, 100);
            //No documentation saying this would be the end of it. When calling dfuplus, nothing happens afterwards.
            //pCallback( err, stdout, stderr, null, conn );
          })
          .on("close", function (_code: any, _signal: any) {
            //TODO?
          });
      });
    })
    .on("error", function (pErr) {
      err = pErr;
      doCallback();
      //pCallback(err, "", "", null, conn);
    })
    .connect(pClientOpts);
}

function ssh2_writeToFile(
  pClientOpts: any,
  pRemoteFile: string,
  pContent: any,
  pCallback: Callback
) {
  pRemoteFile = pRemoteFile.replace(/[\\]/g, "/"); // windows needs this
  var remotePath = path.dirname(pRemoteFile);
  ssh2_exec(pClientOpts, "mkdir -p " + remotePath, function (
    err,
    stdout,
    stderr,
    server,
    conn
  ) {
    if (err) {
      pCallback(err, stdout, stderr, server, conn);
      return;
    }

    conn.sftp(function sftpOpen(err, sftp) {
      if (err) {
        pCallback(err, "", "", server, conn);
        return;
      }

      try {
        //debug('stream start');
        var wStream = sftp.createWriteStream(pRemoteFile, {
          flags: "w+",
          //autoClose: true,
        });
        wStream.on("error", function (err) {
          //debug('stream error %j', err);
          wStream.removeAllListeners("finish");
          pCallback(err, "", "", server, conn);
        });
        wStream.on("finish", function () {
          // wStream.close();
          pCallback(null, "", "", server, conn);
        });
        wStream.end("" + pContent);
      } catch (ex) {
        pCallback(ex, "", "", server, conn);
      }
    });
  });
}

export class SSHClient {
  exec(pClientOpts: any, pCmd: string, pCallback: Callback) {
    if (pClientOpts.privateKey && Fs.existsSync(pClientOpts.privateKey)) {
      pClientOpts.privateKey = Fs.readFileSync(pClientOpts.privateKey, {
        encoding: "utf8",
      });
    }
    //SSH2Utils.exec( pClientOpts, pCmd, pCallback); //function(err, stdout, stderr, server, conn){
    ssh2_exec(pClientOpts, pCmd, pCallback);
  }
  writeFile(
    pClientOpts: any,
    pFilename: string,
    pContent: any,
    pCallback: Callback
  ) {
    if (pClientOpts.privateKey && Fs.existsSync(pClientOpts.privateKey)) {
      pClientOpts.privateKey = Fs.readFileSync(pClientOpts.privateKey, {
        encoding: "utf8",
      });
    }
    //SSH2Utils.writeFile( pClientOpts, pFilename, pContent, pCallback );
    ssh2_writeToFile(pClientOpts, pFilename, pContent, pCallback);
  }
}
