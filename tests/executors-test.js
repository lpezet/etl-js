const assert = require('chai').assert
const LocalExecutorClass = require('../lib/executors').local;
const RemoteExecutorClass = require('../lib/executors').remote;

var fs = require('fs');
var crypto = require('crypto');
var ssh2 = require('ssh2');


const winston = require('winston');

winston.configure({
	level: 'debug'
});
winston.add(winston.transports.Console);

describe('executors',function(){
	
	it('localExec',function(done){	
		var executor = new LocalExecutorClass();
		executor.exec('echo "hello!"', {}, function(err, stdout, stderr) {
			assert.isNull( err );
			assert.include( stdout, "hello!");
			done();
		})	
	});
	
	it('localWriteFile',function(done){	
		var executor = new LocalExecutorClass();
		const oFilePath = '/tmp/etl-js-test.txt';
		
		const oExpectedContent = 'this is dummy content';
		executor.writeFile( oFilePath, oExpectedContent, function(err, stdout, stderr) {
			assert.isNull( err );
			assert.isTrue( fs.existsSync( oFilePath ) );
			var oActualContent = fs.readFileSync( oFilePath );
			assert.equal( oActualContent, oExpectedContent);
			done();
		})	
	});
	
	it('remoteAuthRejected', function(done) {
		var server = null;
		try {
			server = setup_ssh_server_reject_auth();
			server.listen(0, '127.0.0.1', function() {
				//console.log('Listening on port ' + this.address().port);
				var executor = new RemoteExecutorClass( { 
					host: '127.0.0.1', 
					port: this.address().port, 
					username: 'foo', 
					privateKey: fs.readFileSync('tests/executors.key') } );
				executor.exec('echo hello', {}, function( err, stdout, stderr ) {
					
					try {
						assert.isNotNull( err );
						if ( err ) {
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
	
	it('remoteSessionRejected', function(done) {
		var server = null;
		try {
			server = setup_ssh_server_reject_session();
			server.listen(0, '127.0.0.1', function() {
				//console.log('Listening on port ' + this.address().port);
				var executor = new RemoteExecutorClass( { 
					host: '127.0.0.1', 
					port: this.address().port, 
					username: 'foo', 
					privateKey: fs.readFileSync('tests/executors.key') } );
				executor.exec('echo hello', {}, function( err, stdout, stderr ) {
					
					try {
						assert.isNotNull( err );
						if ( err ) {
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
	
	it('remoteStreamError', function(done) {
		var server = null;
		try {
			server = setup_ssh_server_stream_error();
			server.listen(0, '127.0.0.1', function() {
				//console.log('Listening on port ' + this.address().port);
				var executor = new RemoteExecutorClass( { 
					host: '127.0.0.1', 
					port: this.address().port, 
					username: 'foo', 
					privateKey: fs.readFileSync('tests/executors.key') } );
				executor.exec('echo hello', {}, function( err, stdout, stderr ) {
					
					try {
						assert.isNotNull( err );
						if ( err ) {
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
	
	it('remoteExec',function(done){	
		var server = null;
		try {
			server = setup_ssh_server();
			server.listen(0, '127.0.0.1', function() {
				//console.log('Listening on port ' + this.address().port);
				var executor = new RemoteExecutorClass( { 
					host: '127.0.0.1', 
					port: this.address().port, 
					username: 'foo', 
					privateKey: fs.readFileSync('tests/executors.key') } );
				executor.exec('echo hello', {}, function( err, stdout, stderr ) {
					try {
						assert.include( ''+stdout, 'hello');
						if ( err ) {
							done( err );
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
	
	it('remoteWriteFile',function(done){	
		var server = null;
		try {
			server = setup_ssh_server();
			server.listen(0, '127.0.0.1', function() {
				//console.log('Listening on port ' + this.address().port);
				var executor = new RemoteExecutorClass( { 
					host: '127.0.0.1', 
					port: this.address().port, 
					username: 'foo', 
					privateKey: fs.readFileSync('tests/executors.key') } );
				executor.writeFile('test.txt', "hello", function( err, stdout, stderr ) {
					//console.log('err=' + err + ', stdout=' + stdout + ', stderr=' + stderr);
					server.close();
					if ( err ) {
						done( err );
					} else {
						done();
					}
				});	
			});
		} catch (e) {
			done(e);
		}
	});
	
	it('remoteWriteFileWithSFTPError',function(done){	
		var server = null;
		try {
			server = setup_ssh_server_sftp_error();
			server.listen(0, '127.0.0.1', function() {
				//console.log('Listening on port ' + this.address().port);
				var executor = new RemoteExecutorClass( { 
					host: '127.0.0.1', 
					port: this.address().port, 
					username: 'foo', 
					privateKey: fs.readFileSync('tests/executors.key') } );
				executor.writeFile('test.txt', "hello", function( err, stdout, stderr ) {
					try {
						//console.log('err=' + err + ', stdout=' + stdout + ', stderr=' + stderr);	
						if ( err ) {
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
	
	
	var setup_ssh_server_reject_auth = function() {
		var server = new ssh2.Server({
			  hostKeys: [fs.readFileSync('tests/executors.key')]
		});
		
		server.on('connection', function(conn) {
	        conn.on('authentication', function(ctx) {
	        	return ctx.reject();
	        });
		});
		
		return server;
	}
	
	var setup_ssh_server_reject_session = function() {
		var server = new ssh2.Server({
			  hostKeys: [fs.readFileSync('tests/executors.key')]
		});
		
		server.on('connection', function(conn) {
	        conn.on('authentication', function(ctx) {
	        	return ctx.accept();
	        }).on('ready', function() {
	          conn.on('session', function(accept, reject) {
	        	  reject();
	          });
	        });
		});
		
		return server;
	}
	
	var setup_ssh_server_stream_error = function() {
		var server = new ssh2.Server({
			  hostKeys: [fs.readFileSync('tests/executors.key')]
		});
		
		server.on('connection', function(conn) {
	        conn.on('authentication', function(ctx) {
	        	return ctx.accept();
	        }).on('ready', function() {
	          conn.on('session', function(accept, reject) {
	        	  var session = accept();
	        	  session.on('exec', function(accept, reject, info) {
				        var stream = accept();
				        //stream.write('hello\n');
				        stream.exit(123); // ERROR
				        stream.end();
				    });
	          });
	        });
		});
		
		return server;
	}
	
	var setup_ssh_server_sftp_error = function() {
		var server = new ssh2.Server({
			  hostKeys: [fs.readFileSync('tests/executors.key')]
		});
		
		server.on('connection', function(conn) {
	        conn.on('authentication', function(ctx) {
	        	return ctx.accept();
	        }).on('ready', function() {
	          conn.on('session', function(accept, reject) {
	        	  var session = accept();
	        	  session.on('exec', function(accept, reject, info) {
				        var stream = accept();
				        //stream.write('hello\n');
				        stream.exit(0);
				        stream.end();
				    });
		            session.on('sftp', function(accept, reject) {
		            	
		            	var sftp = accept();
		              
		            	sftp.once('OPEN', function(id, filename, flags, attrs) {
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
	}
	
	var setup_ssh_server = function() {
		var utils = ssh2.utils;
		 
		var allowedUser = Buffer.from('foo');
		//var allowedPassword = Buffer.from('bar');
		var allowedPassword = null;
		//var pubKey = utils.genPublicKey(utils.parseKey(fs.readFileSync('tests/executors.pub')));
		var allowedPubKey = utils.parseKey(fs.readFileSync('tests/executors.pub'));
		//console.dir( allowedPubKey );
		//console.log('Pub key = ' + allowedPubKey.getPublicSSH());
		
		var server = new ssh2.Server({
			  hostKeys: [fs.readFileSync('tests/executors.key')]
		});
		
		server.on('connection', function(conn) {
	        conn.on('authentication', function(ctx) {
	        	var user = Buffer.from(ctx.username);
	            if (user.length !== allowedUser.length
	                || !crypto.timingSafeEqual(user, allowedUser)) {
	              return ctx.reject();
	            }

	            switch (ctx.method) {
	              case 'password':
	                var password = Buffer.from(ctx.password);
	                if (password.length !== allowedPassword.length
	                    || !crypto.timingSafeEqual(password, allowedPassword)) {
	                  return ctx.reject();
	                }
	                break;
	              case 'publickey':
	                var allowedPubSSHKey = allowedPubKey.getPublicSSH();
	                if (ctx.key.algo !== allowedPubKey.type
	                    || ctx.key.data.length !== allowedPubSSHKey.length
	                    || !crypto.timingSafeEqual(ctx.key.data, allowedPubSSHKey)
	                    || (ctx.signature && !allowedPubKey.verify(ctx.blob, ctx.signature))) {
	                  return ctx.reject();
	                }
	                break;
	              default:
	                return ctx.reject();
	            }
	            ctx.accept();
	        }).on('ready', function() {
	          conn.on('session', function(accept, reject) {
	            var session = accept();
	            session.on('exec', function(accept, reject, info) {
			        var stream = accept();
			        stream.write('hello\n');
			        stream.exit(0);
			        stream.end();
			    });
	            session.on('sftp', function(accept, reject) {
	            	var sftp = accept();
	              
	            	sftp.once('OPEN', function(id, filename, flags, attrs) {
	            		// FAILURE code:
	            		//return sftp.status(id, 4);
	            	  
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
	              });
	            });
	          });
	        });
	      });
		
		return server;
		
	}
	
	
});
