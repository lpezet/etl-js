import { Callback, NoOpExecutor } from "../lib/executors";
import { assert } from "chai";
import CommandsMod from "../lib/commands";
import ETL from "../lib/etl";

describe("etl-commands", function() {
  class ExecutorClass extends NoOpExecutor {
    mCmdsExecuted: string[];
    constructor() {
      super();
      this.mCmdsExecuted = [];
    }
    getCmdsExecuted(): string[] {
      return this.mCmdsExecuted;
    }

    exec(pCmd: string, _pCmdOpts: any, pCallback: Callback): void {
      this.mCmdsExecuted.push(pCmd);
      // console.log('pCmd=' + pCmd);
      if (pCmd.startsWith("(error)")) {
        // Passing a value for error (first arg)
        pCallback(
          new Error("Error generated for testing purposes."),
          null,
          "failed stderr"
        );
      } else if (pCmd.startsWith("(stop)")) {
        pCallback(null, "stop", null);
      } else if (pCmd.startsWith("(continue)")) {
        pCallback(null, "continue", null);
      } else {
        pCallback(null, pCmd, null);
      }
    }
  }

  let mETLTemplate: any;

  beforeEach(function(done) {
    mETLTemplate = {
      etl: ["activity1", "activity2"],
      activity1: {
        commands: {
          t001test: {
            command: "test me",
            // test: "fail",
            // eslint-disable-next-line @typescript-eslint/camelcase
            exit_on_test_failed: true
          },
          t002test: {
            command: "test me2",
            // test: "fail",
            // eslint-disable-next-line @typescript-eslint/camelcase
            exit_on_test_failed: true
          }
        }
      },
      activity2: {
        commands: {
          abouttofail1: {
            command: "dont test me"
          },
          gonnafail1: {
            command: "gonna fail",
            test: "error",
            // eslint-disable-next-line @typescript-eslint/camelcase
            exit_on_test_failed: true
          },
          shouldnotgethere: {
            command: "nope"
          }
        }
      },
      activity3: {
        commands: {
          someothercommand: {
            command: "hello"
          }
        }
      }
    };
    done();
  });

  afterEach(function(done) {
    done();
  });

  it("basic", function(done) {
    const oSettings = {};
    const oExecutor = new ExecutorClass();
    const oETL = new ETL(oExecutor, oSettings);
    new CommandsMod(oETL);

    oETL.process(mETLTemplate).then(
      function() {
        try {
          assert.deepEqual(oExecutor.getCmdsExecuted(), [
            "test me",
            "test me2",
            "dont test me",
            '(error) && echo "continue" || echo "stop"'
          ]);
          done();
        } catch (e) {
          done(e);
        }
      },
      function(pError: Error) {
        done(pError);
      }
    );
  });

  // it('errorWithExitSingleActivityAndCommand', function(done) {
  it("testFailingInError", function(done) {
    const oETLConfigLite = {
      etl: ["activity1"],
      activity1: {
        commands: {
          t001test: {
            command: "test me",
            test: "error",
            // eslint-disable-next-line @typescript-eslint/camelcase
            exit_on_test_failed: true
          }
        }
      }
    };

    const oSettings = {};
    const oExecutor = new ExecutorClass();
    const oETL = new ETL(oExecutor, oSettings);
    new CommandsMod(oETL);

    oETL.process(oETLConfigLite).then(
      function() {
        try {
          assert.deepEqual(oExecutor.getCmdsExecuted(), [
            '(error) && echo "continue" || echo "stop"'
          ]);
          done();
        } catch (e) {
          done(e);
        }
      },
      function(pError: Error) {
        done(pError);
      }
    );
  });

  it("errorNoExitMultipleActivitiesAndCommands", function(done) {
    const oSettings = {};
    const oExecutor = new ExecutorClass();
    const oETL = new ETL(oExecutor, oSettings);
    new CommandsMod(oETL);

    // eslint-disable-next-line @typescript-eslint/camelcase
    mETLTemplate.activity2.commands.gonnafail1.exit_on_test_failed = false;
    oETL.process(mETLTemplate).then(
      function() {
        try {
          assert.deepEqual(oExecutor.getCmdsExecuted(), [
            "test me",
            "test me2",
            "dont test me",
            '(error) && echo "continue" || echo "stop"',
            "nope"
          ]);
          done();
        } catch (e) {
          done(e);
        }
      },
      function(pError: Error) {
        done(pError);
      }
    );
  });

  it("stopWithExitMultipleActivitiesAndCommands", function(done) {
    const oSettings = {};
    const oExecutor = new ExecutorClass();
    const oETL = new ETL(oExecutor, oSettings);
    new CommandsMod(oETL);

    mETLTemplate.activity2.commands.gonnafail1.test = "stop";
    mETLTemplate.etl.push("step3");
    // console.log(util.inspect(mETLTemplate, false, null, true /* enable colors */))

    oETL.process(mETLTemplate).then(
      function() {
        try {
          assert.deepEqual(oExecutor.getCmdsExecuted(), [
            "test me",
            "test me2",
            "dont test me",
            '(stop) && echo "continue" || echo "stop"'
          ]);
          done();
        } catch (e) {
          done(e);
        }
      },
      function(pError: Error) {
        done(pError);
      }
    );
  });

  it("stopNoExitMultipleActivitiesAndCommands", function(done) {
    const oSettings = {};
    const oExecutor = new ExecutorClass();
    const oETL = new ETL(oExecutor, oSettings);
    new CommandsMod(oETL);

    mETLTemplate.activity2.commands.gonnafail1.test = "stop";
    // eslint-disable-next-line @typescript-eslint/camelcase
    mETLTemplate.activity2.commands.gonnafail1.exit_on_test_failed = false;
    // console.log('############ Template ###############');
    // console.log( JSON.stringify( mETLTemplate ) );
    // console.log('#####################################');

    oETL.process(mETLTemplate).then(
      function() {
        try {
          assert.deepEqual(oExecutor.getCmdsExecuted(), [
            "test me",
            "test me2",
            "dont test me",
            '(stop) && echo "continue" || echo "stop"',
            "nope"
          ]);
          done();
        } catch (e) {
          done(e);
        }
      },
      function(pError: Error) {
        done(pError);
      }
    );
  });
});
