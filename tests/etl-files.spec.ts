import ETL from "../../lib/rearch/etl";
import { Callback, NoOpExecutor } from "../../lib/rearch/executors";
import FilesMod from "../../lib/rearch/mods/files";
import CollectMod from "./etl/collect";
import { assert } from "chai";

describe("etl-files", function() {
  let mETLTemplate: any = null;

  beforeEach(function(done) {
    mETLTemplate = {
      etl: ["step1", "step2", "step3"],
      step1: {
        collects: {
          t001test: {
            var: "t001test",
            result: "toto"
          },
          t002test: {
            var: "t002test",
            result: ["toto", "titi"]
          }
        }
      },
      step2: {
        collects: {
          singleResult1: {
            var: "singleResult1",
            result: "toto"
          },
          singleResult2: {
            var: "singleResult2",
            result: "titi"
          }
        }
      },
      step3: {
        files: {
          "/tmp/toto.txt": {
            source: "https://a.b.c/toto.txt"
          }
        }
      }
    };
    done();
  });

  afterEach(function(done) {
    done();
  });

  it("sanityTest", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOptions: any, pCallback: Callback): void {
        pCallback(null, pCmd);
      }
    }
    const oSettings = {};
    const oETL = new ETL(new ExecutorClass(), oSettings);
    new FilesMod().register(oETL);
    new CollectMod().register(oETL);

    oETL.processTemplate(mETLTemplate, {}).then(
      function(_pData) {
        // console.log('pData=');
        // console.dir(pData);
        done();
      },
      function(pError) {
        done(pError);
      }
    );
  });

  it("filesSourceTemplate", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOptions: any, pCallback: Callback): void {
        assert.include(pCmd, "http://a.b.c/toto.txt");
        pCallback(null, pCmd);
      }
    }
    mETLTemplate["step3"] = {
      files: {
        "/tmp/toto.txt": {
          source: "http://a.b.c/{{ vars.t001test }}.txt"
        }
      }
    };
    const oSettings = {};
    const oETL = new ETL(new ExecutorClass(), oSettings);
    new FilesMod().register(oETL);
    new CollectMod().register(oETL);

    oETL.processTemplate(mETLTemplate, {}).then(
      function(_pData) {
        // console.dir( pData );
        done();
      },
      function(pError) {
        done(pError);
      }
    );
  });

  it("filesTargetTemplate", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOptions: any, pCallback: Callback): void {
        assert.include(pCmd, "/tmp/toto.txt");
        pCallback(null, pCmd);
      }
    }
    mETLTemplate["step3"] = {
      files: {
        "/tmp/{{ vars.t001test }}.txt": {
          source: "http://a.b.c/titi.txt"
        }
      }
    };
    const oSettings = {};
    const oETL = new ETL(new ExecutorClass(), oSettings);
    new FilesMod().register(oETL);
    new CollectMod().register(oETL);

    oETL.processTemplate(mETLTemplate, {}).then(
      function(_pData) {
        // console.dir( 'Data=' + pData );
        done();
      },
      function(pError) {
        done(pError);
      }
    );
  });

  it("filesTargetAndSourceTemplate", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOptions: any, pCallback: Callback): void {
        assert.include(pCmd, "/tmp/toto.txt");
        assert.include(pCmd, "http://a.b.c/toto.txt");
        pCallback(null, pCmd);
      }
    }
    mETLTemplate["step3"] = {
      files: {
        "/tmp/{{ vars.t001test }}.txt": {
          source: "http://a.b.c/{{ vars.t001test }}.txt"
        }
      }
    };
    const oSettings = {};
    const oETL = new ETL(new ExecutorClass(), oSettings);
    new FilesMod().register(oETL);
    new CollectMod().register(oETL);

    oETL.processTemplate(mETLTemplate, {}).then(
      function(_pData) {
        // console.dir( pData );
        done();
      },
      function(pError) {
        done(pError);
      }
    );
  });

  it("filesTargetAndSourceMultiValueTemplate", function(done) {
    class ExecutorClass extends NoOpExecutor {
      exec(pCmd: string, _pCmdOptions: any, pCallback: Callback): void {
        if (pCmd.includes("/tmp/toto.txt")) {
          assert.include(pCmd, "http://a.b.c/toto.txt");
        } else if (pCmd.includes("/tmp/titi.txt")) {
          assert.include(pCmd, "http://a.b.c/titi.txt");
        } else {
          throw new Error("Unexpected command: " + pCmd);
        }
        pCallback(null, pCmd);
      }
    }
    mETLTemplate["step3"] = {
      files: {
        "/tmp/{{ vars.t002test }}.txt": {
          source: "http://a.b.c/{{ vars.t002test }}.txt"
        }
      }
    };
    const oSettings = {};
    const oETL = new ETL(new ExecutorClass(), oSettings);
    new FilesMod().register(oETL);
    new CollectMod().register(oETL);

    oETL.processTemplate(mETLTemplate, {}).then(
      function(_pData) {
        // console.dir( pData );
        done();
      },
      function(pError) {
        done(pError);
      }
    );
  });
  /*
	it('errorNoExitMultipleActivitiesAndCommands', function(done) {
		var oSettings = {};
    	var oETL = new ETL( new ExecutorClass(), oSettings );
    	new CommandsClass( oETL );
		
    	mETLTemplate.step2.commands.gonnafail1.exit_on_test_failed = false;
		oETL.process( mETLTemplate ).then(function( pData ) {
			done();
		}, function( pError ) {
			done( pError );
		});
	});
	
	it('stopWithExitMultipleActivitiesAndCommands', function(done) {
		var oSettings = {};
    	var oETL = new ETL( new ExecutorClass(), oSettings );
    	new CommandsClass( oETL );
		
    	mETLTemplate.step2.commands.gonnafail1.test = "stop";
    	mETLTemplate.etl.push('step3');
    	//console.log(util.inspect(mETLTemplate, false, null, true ))
		
    	oETL.process( mETLTemplate ).then(function( pData ) {
    		//console.dir( pData );
    		//console.log('End result: (pData)');
    		//console.log(util.inspect(pData, false, null, true ))
			//done( 'Should have exited with error (?)');
    		assert.notExists( pData.step2.commands['shouldnotgethere'] );
    		assert.notExists( pData['step3'] );
    		done();
		}, function( pError ) {
			done( pError );
		});
	});
	
	it('stopNoExitMultipleActivitiesAndCommands', function(done) {
		var oSettings = {};
    	var oETL = new ETL( new ExecutorClass(), oSettings );
    	new CommandsClass( oETL );
		
    	mETLTemplate.step2.commands.gonnafail1.test = "stop";
    	mETLTemplate.step2.commands.gonnafail1.exit_on_test_failed = false;
		oETL.process( mETLTemplate ).then(function( pData ) {
			done();
		}, function( pError ) {
			done( pError );
		});
	});
	*/
});
