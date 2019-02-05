const assert = require('chai').assert
const LocalExecutorClass = require('../lib/executors').local;
const RemoteExecutorClass = require('../lib/executors').remote;

const winston = require('winston');

winston.configure({
	level: 'debug'
});
winston.add(winston.transports.Console);

describe('executors',function(){
	
	it('local',function(done){
    	
		var executor = new LocalExecutorClass();
		executor.exec('echo "hello!"', {}, function(err, stdout, stderr) {
			assert.isNull( err );
			assert.equal( "hello!\n", stdout );
			done();
		})
    	
	});
	
	it('remote',function(done){
    	
		var settings = {
				host: '127.0.0.1',
				username: 'hello',
				password: 'world'
		}
		var executor = new RemoteExecutorClass( settings );
		
    	done();
	});
	
	
});
