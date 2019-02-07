const assert = require('chai').assert
const sinon = require('sinon');
const load_file = require('./load_file');
const TestedClass = require('../lib/commands');
const winston = require('winston');

winston.configure({
	level: 'debug'
});
winston.add(winston.transports.Console);

describe('commands',function(){
	
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});

	it('basic',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.isNotNull( pCallback );
    		var error = null;
    		var stdout = "";
    		var stderr = "";
    		switch( pCmdOpts.context ) {
    			case "001_test":
    				if ( pCmd.startsWith("gunzip") ) {
	    				assert.equal(pCmd, "gunzip test.gz");
	        			assert.isNotEmpty( pCmdOpts );
	        			assert.equal( pCmdOpts.cwd, "/var/lib/somedir");
    				} else {
    					assert.equal(pCmd, '([ -f test.gz ]) && echo "continue" || echo "stop"');
            			//assert.isEmpty( pCmdOpts );
            			stdout="continue";
    	    		}
        			break;
    			case "002_test_fail":
    				stdout = "stop";
    				break;
    			case "005_test_error":
    				error = { code: 1 };
    				break;
    		}
    		pCallback( error, stdout, stderr );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( "./commands/basic.yml" );
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
});