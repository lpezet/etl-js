const TestedClass = require('../lib/mysqls');
const load_file = require('./load_file');

describe('mysqls',function(){
	
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});

	it('basic',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		switch ( pCmdOpts.context ) {
    			case "/a/b/c.txt":
    				assert.include( pCmd, "--execute='SELECT * FROM test'");
    				break;
    		}
    		pCallback( null, "", "");
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( './mysqls/basic.yml');
		
		oTested.handle( 'root', oConfig['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
});
