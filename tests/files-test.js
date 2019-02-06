const assert = require('chai').assert
const sinon = require('sinon');
const load_file = require('./load_file');
const TestedClass = require('../lib/files');

describe('files',function(){
	
	before(function(done) {
		done();
	});
	
	after(function(done) {
		done();
	});

	it('basic',function(done){
    	
    	var ExecutorClass = function() {};
    	ExecutorClass.prototype.exec = function( pCmd, pCmdOpts, pCallback ) {
    		assert.equal( pCmd, '[ ! -d $(dirname "/tmp/file.txt") ] && mkdir -p $(dirname "/tmp/file.txt"); wget -O "/tmp/file.txt" "https://abc.def.com/file.txt"');
    		pCallback( null, "", "" );
    	}
    	
    	var oExecutor = new ExecutorClass();
    	var oTested = new TestedClass();
    	
		var oConfig = load_file( "./files/basic.yml" );
		
		oTested.handle( 'root' , oConfig['root'], oExecutor ).then(function() {
			done();
		}, function( pError ) {
			console.log( pError );
			done( pError );
		})
		
    	
	});
});