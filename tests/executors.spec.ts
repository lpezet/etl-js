import { assert } from "chai";
import { Local, NoOpExecutor, Remote } from "../lib/executors";
import { Callback, ISSHClient } from "../lib/ssh-client";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import * as ssh2 from "ssh2";
import { ParsedKey } from "ssh2-streams";

/*
import { configureLogger } from "../lib/logger";
configureLogger({
  appenders: {
    console: { type: "console", layout: { type: "colored" } }
  },
  categories: {
    default: { appenders: ["console"], level: "all" }
  }
});
*/

const setupSshServer = function(): ssh2.Server {
  const utils = ssh2.utils;

  const allowedUser = Buffer.from("foo");
  const allowedPassword = Buffer.from("bar");
  // var pubKey = utils.genPublicKey(utils.parseKey(fs.readFileSync('tests/executors.pub')));
  const allowedPubKey = utils.parseKey(
    fs.readFileSync("tests/executors.pub")
  ) as ParsedKey;
  // console.dir( allowedPubKey );
  // console.log('Pub key = ' + allowedPubKey.getPublicSSH());

  const server = new ssh2.Server({
    hostKeys: [fs.readFileSync("tests/executors.key")]
  });

  server.on("connection", function(conn) {
    conn
      .on("authentication", function(ctx) {
        const user = Buffer.from(ctx.username);
        if (
          user.length !== allowedUser.length ||
          !crypto.timingSafeEqual(user, allowedUser)
        ) {
          return ctx.reject();
        }

        switch (ctx.method) {
          case "password": {
            const password: Buffer = Buffer.from(ctx.password);
            if (
              password.length !== allowedPassword.length ||
              !crypto.timingSafeEqual(password, allowedPassword)
            ) {
              return ctx.reject();
            }
            break;
          }
          case "publickey": {
            const allowedPubSSHKey = allowedPubKey.getPublicSSH();
            if (
              ctx.key.algo !== allowedPubKey.type ||
              ctx.key.data.length !== allowedPubSSHKey.length ||
              !crypto.timingSafeEqual(
                ctx.key.data,
                Buffer.from(allowedPubSSHKey)
              ) ||
              (ctx.signature && !allowedPubKey.verify(ctx.blob, ctx.signature))
            ) {
              return ctx.reject();
            }
            break;
          }
          default:
            return ctx.reject();
        }
        ctx.accept();
      })
      .on("ready", function() {
        conn.on("session", function(accept, _reject) {
          const session = accept();
          session.on("exec", function(accept, _reject, _info) {
            const stream = accept();
            stream.write("hello\n");
            stream.write("world\n");
            stream.write("how\n");
            stream.write("u\n");
            stream.write("doing?\n");
            stream.exit(0);
            stream.end();
          });
          session.on("sftp", function(accept, _reject) {
            const sftp = accept();

            sftp.once("OPEN", function(id, _filename, _flags, _attrs) {
              // FAILURE code:
              // return sftp.status(id, 4);

              const handle = Buffer.alloc(4);
              handle.writeUInt32BE(1, 0, true);
              sftp.handle(id, handle);

              sftp.once("WRITE", function(id, _handle, _offset, _data) {
                sftp.status(id, 0);
              });

              sftp.once("CLOSE", function(id, _handle) {
                sftp.status(id, 0);
                conn.end();
              });
            });
          });
        });
      });
  });

  return server;
};

const setupSshServerRejectAuth = function(): ssh2.Server {
  const server = new ssh2.Server({
    hostKeys: [fs.readFileSync("tests/executors.key")]
  });

  server.on("connection", function(conn) {
    conn.on("authentication", function(ctx) {
      return ctx.reject();
    });
  });

  return server;
};

const setupSshServerRejectSession = function(): ssh2.Server {
  const server = new ssh2.Server({
    hostKeys: [fs.readFileSync("tests/executors.key")]
  });

  server.on("connection", function(conn) {
    conn
      .on("authentication", function(ctx) {
        return ctx.accept();
      })
      .on("ready", function() {
        conn.on("session", function(_accept, reject) {
          reject();
        });
      });
  });

  return server;
};

const setupSshServerStreamError = function(): ssh2.Server {
  const server = new ssh2.Server({
    hostKeys: [fs.readFileSync("tests/executors.key")]
  });

  server.on("connection", function(conn) {
    conn
      .on("authentication", function(ctx) {
        return ctx.accept();
      })
      .on("ready", function() {
        conn.on("session", function(accept, _reject) {
          const session = accept();
          session.on("exec", function(accept, _reject, _info) {
            const stream = accept();
            stream.stderr.write("hello\n");
            stream.exit(123); // ERROR
            stream.end();
          });
        });
      });
  });

  return server;
};

const setupSshServerSftpError = function(): ssh2.Server {
  const server = new ssh2.Server({
    hostKeys: [fs.readFileSync("tests/executors.key")]
  });

  server.on("connection", function(conn) {
    conn
      .on("authentication", function(ctx) {
        return ctx.accept();
      })
      .on("ready", function() {
        conn.on("session", function(accept, _reject) {
          const session = accept();
          session.on("exec", function(accept, _reject, _info) {
            const stream = accept();
            // stream.write('hello\n');
            stream.exit(0);
            stream.end();
          });
          session.on("sftp", function(accept, _reject) {
            const sftp = accept();

            sftp.once("OPEN", function(id, _filename, _flags, _attrs) {
              // FAILURE code:
              return sftp.status(id, 4);
              /*
                  var handle = Buffer.alloc(4);
                  handle.writeUInt32BE(1, 0, true);
                  sftp.handle(id, handle);
                  
                  sftp.once('WRITE', function(id, handle, offset, data) {
                    sftp.status(id, 0);
                  });
                    
                  sftp.once('CLOSE', function(id, handle) {
                    sftp.status(id, 0);
                    conn.end();
                  });
                  */
            });
          });
        });
      });
  });

  return server;
};

describe("executors", function() {
  it("noOpReady", function(done) {
    const executor = new NoOpExecutor();
    executor
      .ready()
      .then(
        () => done(),
        (err: Error) => {
          done(err);
        }
      )
      .catch((err: Error) => {
        done(err);
      });
  });
  it("noOpOS", function(done) {
    const executor = new NoOpExecutor();
    executor
      .ready()
      .then(
        () => {
          const os = executor.os();
          assert.isNotNull(os);
          done();
        },
        (err: Error) => {
          done(err);
        }
      )
      .catch((err: Error) => {
        done(err);
      });
  });

  it("noOpExec", function(done) {
    const executor = new NoOpExecutor();
    executor.exec('echo "hello!"', {}, function(err, stdout, stderr) {
      assert.isNull(err);
      assert.isNull(stderr);
      assert.equal(stdout, "");
      done();
    });
  });
  it("noOpWriteFile", function(done) {
    const executor = new NoOpExecutor();
    executor.writeFile("", "", function(err, stdout, stderr) {
      assert.isNull(err);
      assert.isNull(stderr);
      assert.equal(stdout, "");
      done();
    });
  });
  it("localExec", function(done) {
    const executor = new Local();
    executor.exec('echo "hello!"', {}, function(err, stdout, _stderr) {
      assert.isNull(err);
      assert.include(stdout, "hello!");
      done();
    });
  });
  it("localExecWithEcho", function(done) {
    const executor = new Local({ echo: true });
    executor.exec('echo "hello!"', {}, function(err, stdout, _stderr) {
      assert.isNull(err);
      assert.include(stdout, "hello!");
      done();
    });
  });
  it("localExecWithEchoStdErr", function(done) {
    const executor = new Local({ echo: true });
    executor.exec('>&2 echo "error"', {}, function(err, _stdout, stderr) {
      assert.isNull(err);
      assert.include(stderr, "error");
      done();
    });
  });
  it("localReady", function(done) {
    const executor = new Local();
    executor
      .ready()
      .then(
        () => done(),
        (err: Error) => {
          done(err);
        }
      )
      .catch((err: Error) => {
        done(err);
      });
  });

  it("localOS", function(done) {
    const executor = new Local();
    executor
      .ready()
      .then(
        () => {
          const os = executor.os();
          assert.isNotNull(os);
          done();
        },
        (err: Error) => {
          done(err);
        }
      )
      .catch((err: Error) => {
        done(err);
      });
  });

  it("localWriteFile", function(done) {
    const settings: any = { test: true };
    const executor = new Local(settings);
    const oFilePath = path.resolve(os.tmpdir(), "etl-js-test.txt");

    const oExpectedContent = "this is dummy content";
    executor.writeFile(oFilePath, oExpectedContent, function(
      err,
      _stdout,
      _stderr
    ) {
      assert.isNull(err);
      assert.isTrue(fs.existsSync(oFilePath));
      const oActualContent = fs.readFileSync(oFilePath);
      assert.equal(oActualContent.toString(), oExpectedContent);
      done();
    });
  });

  // TODO: find way to get callback with "err" set to something. Here fs.writeFile in Local executor simply throws permission denied error.
  it("localWriteFileError", function(done) {
    const executor = new Local();
    const oFilePath = path.resolve(os.tmpdir(), "etl-js-test.txt");
    try {
      fs.writeFileSync(oFilePath, "dont matter");
      fs.chmodSync(oFilePath, "000");
      executor.writeFile(oFilePath, "new content", function(
        err,
        _stdout,
        _stderr
      ) {
        assert.isNotNull(err);
        fs.unlinkSync(oFilePath);
        done();
      });
    } catch (e) {
      fs.unlinkSync(oFilePath);
      done(); // not exactly what we want, but that's all we have right now.
    }
  });

  it("remoteAuthRejected", function(done) {
    let server: ssh2.Server;
    try {
      server = setupSshServerRejectAuth();
      server.listen(0, "127.0.0.1", function() {
        // console.log('Listening on port ' + this.address().port);
        const executor = new Remote({
          host: "127.0.0.1",
          port: server.address().port,
          username: "foo",
          privateKey: fs.readFileSync("tests/executors.key")
        });
        executor.exec("echo hello", {}, function(err, _stdout, _stderr) {
          try {
            assert.isNotNull(err);
            if (err) {
              done();
            } else {
              done("Error should have been raised and caught.");
            }
          } catch (e) {
            done(e);
          } finally {
            server.close();
          }
        });
      });
    } catch (e) {
      done(e);
    }
  });

  it("remoteSessionRejected", function(done) {
    let server: ssh2.Server;
    try {
      server = setupSshServerRejectSession();
      server.listen(0, "127.0.0.1", function() {
        // console.log('Listening on port ' + this.address().port);
        const executor = new Remote({
          host: "127.0.0.1",
          port: server.address().port,
          username: "foo",
          privateKey: fs.readFileSync("tests/executors.key")
        });
        executor.exec("echo hello", {}, function(err, _stdout, _stderr) {
          try {
            assert.isNotNull(err);
            if (err) {
              done();
            } else {
              done("Error should have been raised and caught.");
            }
          } catch (e) {
            done(e);
          } finally {
            server.close();
          }
        });
      });
    } catch (e) {
      done(e);
    }
  });

  it("remoteStreamError", function(done) {
    let server: ssh2.Server;
    try {
      server = setupSshServerStreamError();
      server.listen(0, "127.0.0.1", function() {
        // console.log('Listening on port ' + this.address().port);
        const executor = new Remote({
          host: "127.0.0.1",
          port: server.address().port,
          username: "foo",
          privateKey: fs.readFileSync("tests/executors.key")
        });
        executor.exec("echo hello", {}, function(err, _stdout, _stderr) {
          try {
            assert.isNotNull(err);
            if (err) {
              done();
            } else {
              done("Error should have been raised and caught.");
            }
          } catch (e) {
            console.log("Error: " + e);
            done(e);
          } finally {
            server.close();
          }
        });
      });
    } catch (e) {
      done(e);
    }
  });

  it("remoteReady", function(done) {
    let server: ssh2.Server;
    try {
      server = setupSshServer();
      server.listen(0, "127.0.0.1", function() {
        // console.log('Listening on port ' + this.address().port);
        const executor = new Remote({
          host: "127.0.0.1",
          port: server.address().port,
          username: "foo",
          privateKey: fs.readFileSync("tests/executors.key")
        });
        executor
          .ready()
          .then(
            () => {
              done();
            },
            (err: Error) => {
              done(err);
            }
          )
          .catch((err: Error) => {
            done(err);
          })
          .finally(() => {
            server.close();
          });
      });
    } catch (e) {
      done(e);
    }
  });

  it("remoteOSFromSettings", function(done) {
    class MockSSHClient implements ISSHClient {
      exec(_pClientOpts: any, _pCmd: string, _pCallback: Callback): void {
        throw new Error("Error generated for testing purposes.");
      }
      writeFile(
        _pClientOpts: any,
        _pFilename: string,
        _pContent: any,
        _pCallback: Callback
      ): void {
        throw new Error("Error generated for testing purposes.");
      }
    }
    const sshClient = new MockSSHClient();
    const executor = new Remote({ sshClient: sshClient, os: "Windows 10" });
    executor
      .ready()
      .then(() => {
        if (executor.os() === "Windows 10") {
          done();
        } else {
          done(new Error("OS must be [Windows 10] as specified in settings."));
        }
      })
      .catch((err: Error) => {
        done(err);
      });
  });

  it("remoteOSWithUnexpectedError", function(done) {
    class MockSSHClient implements ISSHClient {
      exec(_pClientOpts: any, _pCmd: string, _pCallback: Callback): void {
        throw new Error("error generated for testing purposes.");
      }
      writeFile(
        _pClientOpts: any,
        _pFilename: string,
        _pContent: any,
        _pCallback: Callback
      ): void {
        throw new Error("error generated for testing purposes.");
      }
    }
    const sshClient = new MockSSHClient();
    const executor = new Remote({ sshClient: sshClient });
    executor
      .ready()
      .then(() => {
        done(
          new Error("Supposed to reject error generated while detecting OS.")
        );
      })
      .catch(() => {
        done();
      });
  });

  it("remoteOSWithError", function(done) {
    class MockSSHClient implements ISSHClient {
      exec(_pClientOpts: any, _pCmd: string, pCallback: Callback): void {
        pCallback(new Error("Error generated for testing purposes."));
      }
      writeFile(
        _pClientOpts: any,
        _pFilename: string,
        _pContent: any,
        _pCallback: Callback
      ): void {
        throw new Error("Error generated for testing purposes.");
      }
    }
    const sshClient = new MockSSHClient();
    const executor = new Remote({ sshClient: sshClient });
    executor
      .ready()
      .then(() => {
        done(
          new Error("Supposed to reject error generated while detecting OS.")
        );
      })
      .catch(() => {
        done();
      });
  });

  it("remoteOSWindowsWithError", function(done) {
    class MockSSHClient implements ISSHClient {
      exec(_pClientOpts: any, pCmd: string, pCallback: Callback): void {
        if (pCmd.startsWith("echo")) {
          pCallback(null, "");
        } else if (pCmd === "systeminfo") {
          pCallback(new Error("Error generated for testing purposes."));
        }
      }
      writeFile(
        _pClientOpts: any,
        _pFilename: string,
        _pContent: any,
        _pCallback: Callback
      ): void {
        throw new Error("Error generated for testing purposes.");
      }
    }
    const sshClient = new MockSSHClient();
    const executor = new Remote({ sshClient: sshClient });
    executor
      .ready()
      .then(() => {
        done(
          new Error("Supposed to reject error generated while detecting OS.")
        );
      })
      .catch(() => {
        done();
      });
  });

  it("remoteOSWindows", function(done) {
    const SYS_INFO = `Host Name: 			DRG
OS Name: 			Microsoft Windows 7 Ultimate
OS Version: 			6.1.7600 N/A Build 7600
OS Manufacturer: 		Microsoft Corporation
OS Configuration: 		Standalone Workstation
OS Build Type: 			Multiprocessor Free
Registered Owner: 		Mike Ribson
Registered Organization:	SY0-201.com
Product ID: 			00426-065-0543977-86656
Original Install Date: 		7/10/2009, 4:42:31 AM
System Boot Time: 		8/22/2009, 12:46:35 PM
System Manufacturer: 		Hewlett-Packard
System Model: 			HP Pavilion dv7 Notebook PC
System Type: 			x64-based PC`;
    class MockSSHClient implements ISSHClient {
      exec(_pClientOpts: any, pCmd: string, pCallback: Callback): void {
        if (pCmd.startsWith("echo")) {
          pCallback(null, "");
        } else if (pCmd === "systeminfo") {
          pCallback(null, SYS_INFO);
        }
      }
      writeFile(
        _pClientOpts: any,
        _pFilename: string,
        _pContent: any,
        _pCallback: Callback
      ): void {
        throw new Error("Error generated for testing purposes.");
      }
    }
    const sshClient = new MockSSHClient();
    const executor = new Remote({ sshClient: sshClient });
    executor
      .ready()
      .then(() => {
        if (executor.os() === "Windows 7 Ultimate") {
          done();
        } else {
          done(new Error("OS must be [Windows 7 Ultimate]."));
        }
      })
      .catch((err: Error) => {
        done(err);
      });
  });

  it("remoteOSWindowsUnrecognizedSystemInfoOutput", function(done) {
    const SYS_INFO = "Stuff We Do Not Expect";
    class MockSSHClient implements ISSHClient {
      exec(_pClientOpts: any, pCmd: string, pCallback: Callback): void {
        if (pCmd.startsWith("echo")) {
          pCallback(null, "");
        } else if (pCmd === "systeminfo") {
          pCallback(null, SYS_INFO);
        }
      }
      writeFile(
        _pClientOpts: any,
        _pFilename: string,
        _pContent: any,
        _pCallback: Callback
      ): void {
        throw new Error("Error generated for testing purposes.");
      }
    }
    const sshClient = new MockSSHClient();
    const executor = new Remote({ sshClient: sshClient });
    executor
      .ready()
      .then(() => {
        if (executor.os() === "Windows") {
          done();
        } else {
          done(
            new Error(
              "OS must be [Windows] when systeminfo output not supported."
            )
          );
        }
      })
      .catch((err: Error) => {
        done(err);
      });
  });

  it("remoteOS", function(done) {
    let server: ssh2.Server;
    try {
      server = setupSshServer();
      server.listen(0, "127.0.0.1", function() {
        // console.log('Listening on port ' + this.address().port);
        const executor = new Remote({
          host: "127.0.0.1",
          port: server.address().port,
          username: "foo",
          privateKey: fs.readFileSync("tests/executors.key")
        });
        executor
          .ready()
          .then(
            () => {
              const os = executor.os();
              assert.isNotNull(os);
              done();
            },
            (err: Error) => {
              done(err);
            }
          )
          .catch((err: Error) => {
            done(err);
          })
          .finally(() => {
            server.close();
          });
      });
    } catch (e) {
      done(e);
    }
  });

  it("remoteExecWithPrivateKey", function(done) {
    let server: ssh2.Server;
    try {
      server = setupSshServer();
      server.listen(0, "127.0.0.1", function() {
        // console.log('Listening on port ' + this.address().port);
        const executor = new Remote({
          host: "127.0.0.1",
          port: server.address().port,
          username: "foo",
          privateKey: fs.readFileSync("tests/executors.key")
        });
        executor.exec("echo hello", {}, function(err, stdout, _stderr) {
          try {
            assert.include("" + stdout, "hello");
            if (err) {
              done(err);
            } else {
              done();
            }
          } catch (e) {
            done(e);
          } finally {
            server.close();
          }
        });
      });
    } catch (e) {
      done(e);
    }
  });

  it("remoteExecWithUsernamePassword", function(done) {
    let server: ssh2.Server;
    try {
      server = setupSshServer();
      server.listen(0, "127.0.0.1", function() {
        // console.log('Listening on port ' + this.address().port);
        const executor = new Remote({
          host: "127.0.0.1",
          port: server.address().port,
          username: "foo",
          password: "bar"
        });
        executor.exec(
          "echo hello",
          { cwd: "/tmp", env: { TOTO: "TITI" } },
          function(err, stdout, _stderr) {
            try {
              assert.include("" + stdout, "hello");
              if (err) {
                done(err);
              } else {
                done();
              }
            } catch (e) {
              done(e);
            } finally {
              server.close();
            }
          }
        );
      });
    } catch (e) {
      done(e);
    }
  });

  it("remoteExecStdout", function(done) {
    let server: ssh2.Server;
    try {
      server = setupSshServer();
      server.listen(0, "127.0.0.1", function() {
        // console.log('Listening on port ' + this.address().port);
        const executor = new Remote({
          host: "127.0.0.1",
          port: server.address().port,
          username: "foo",
          password: "bar"
        });
        executor.exec(
          "echo dontmatter",
          { cwd: "/tmp", env: { TOTO: "TITI" } },
          function(err, stdout, _stderr) {
            try {
              assert.equal(stdout, "hello\nworld\nhow\nu\ndoing?\n");
              if (err) {
                done(err);
              } else {
                done();
              }
            } catch (e) {
              done(e);
            } finally {
              server.close();
            }
          }
        );
      });
    } catch (e) {
      done(e);
    }
  });

  it("remoteWriteFile", function(done) {
    let server: ssh2.Server;
    try {
      server = setupSshServer();
      server.listen(0, "127.0.0.1", function() {
        // console.log('Listening on port ' + this.address().port);
        const executor = new Remote({
          host: "127.0.0.1",
          port: server.address().port,
          username: "foo",
          privateKey: fs.readFileSync("tests/executors.key")
        });
        executor.writeFile("test.txt", "hello", function(
          err,
          _stdout,
          _stderr
        ) {
          // console.log('err=' + err + ', stdout=' + stdout + ', stderr=' + stderr);
          server.close();
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      });
    } catch (e) {
      done(e);
    }
  });

  it("remoteWriteFileWithSFTPError", function(done) {
    let server: ssh2.Server;
    try {
      server = setupSshServerSftpError();
      server.listen(0, "127.0.0.1", () => {
        // console.log('Listening on port ' + this.address().port);
        const executor = new Remote({
          host: "127.0.0.1",
          port: server.address().port,
          username: "foo",
          privateKey: fs.readFileSync("tests/executors.key")
        });
        executor.writeFile("test.txt", "hello", function(
          err,
          _stdout,
          _stderr
        ) {
          try {
            // console.log('err=' + err + ', stdout=' + stdout + ', stderr=' + stderr);
            if (err) {
              done();
            } else {
              done("Error should have been raised and caught.");
            }
          } finally {
            server.close();
          }
        });
      });
    } catch (e) {
      done(e);
    }
  });
});
