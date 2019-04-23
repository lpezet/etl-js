const path    = require('path');
const Client = require('ssh2').Client;
const Fs = require('fs');

SSHClient = function() {
}

var ssh2_writeToFile = function( pClientOpts, pRemoteFile, pContent, pCallback) {
	pRemoteFile = pRemoteFile.replace(/[\\]/g,'/'); // windows needs this
	var remotePath = path.dirname(pRemoteFile);
	ssh2_exec( pClientOpts, 'mkdir -p ' + remotePath, function( err, stdout, stderr, server, conn ) {
		if (err) {
			pCallback( err, stdout, stderr, server, conn );
			return;
		}
		
		conn.sftp(function sftpOpen(err, sftp){
			if (err) {
				pCallback( err, "", "", server, conn );
				return;
			}
			
			try{
		        //debug('stream start');
		        var wStream = sftp.createWriteStream(pRemoteFile, {flags: 'w+', encoding: null, autoClose: true});
		        wStream.on('error', function (err) {
		          //debug('stream error %j', err);
		          wStream.removeAllListeners('finish');
		          pCallback( err, "", "", server, conn);
		        });
		        wStream.on('finish', function () {
		        	wStream.close();
		        	pCallback( null, "", "", server, conn);
		        });
		        wStream.end(''+pContent);
		      } catch(ex) {
		    	  pCallback( ex, "", "", server, conn);
		      }
		});
	});
}

var ssh2_exec = function( pClientOpts, pCmd, pCallback ) {
	var stdout = null;
    var stderr = null;
    var err = null;
    var code = null;	
    //var signal = null;
    var callbackCalled = false;
    var timeoutCallback = null;
    
    var doCallback = function() {
    	if ( !err && (stderr || code) ) {
    		err = new Error( stderr || code );
    	}
    	if (!callbackCalled) {
    		callbackCalled = true;
    		if (timeoutCallback) clearInterval(timeoutCallback);
    		pCallback( err, stdout, stderr, null, conn );
    	}
    }
    
	var conn = new Client();
	//console.log('ssh2_exec: 1');
	conn.on('ready', function() {
		conn.exec( pCmd, function( pErr, stream) {	
	    if ( pErr) {
	    	err = pErr;
	    	doCallback();
	    	//pCallback( err, "", "", null, conn );
	    	return;
	    }
	    
	    
	    stream.on('close', function(pCode, pSignal) {
	    	code = pCode;
	    	//signal = pSignal;
	    	//console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
	    	doCallback();
	    }).on('data', function( pData ) {
	    	stdout = pData;
	    }).on('error', function( pData ) {
	    	//console.log('error');
	    	//TODO
	    	//stdout = data;
	    }).on('end', function( pData ) {
	    	//TODO?
	    	//stdout = data;
	    }).on('exit', function( pData ) {
	    	//TODO?
	    	//stdout = data;
	    }).stderr.on('data', function( pData ) {
	    	stderr = pData;
	    	if ( timeoutCallback ) clearInterval( timeoutCallback );
	    	timeoutCallback = setInterval(doCallback, 100);
	    	//No documentation saying this would be the end of it. When calling dfuplus, nothing happens afterwards.
	    	//pCallback( err, stdout, stderr, null, conn );
	    }).on('close', function(code, signal) {
	    	//TODO?
	    });
	  });
	}).on('error', function( pErr ) {
		err = pErr;
		doCallback();
		//pCallback(err, "", "", null, conn);
	}).connect( pClientOpts );
}

SSHClient.prototype.exec = function( pClientOpts, pCmd, pCallback ) {
	if ( pClientOpts.privateKey && Fs.existsSync( pClientOpts.privateKey ) ) {
		pClientOpts.privateKey = Fs.readFileSync( pClientOpts.privateKey, {encoding: 'utf8'});
	}
	//SSH2Utils.exec( pClientOpts, pCmd, pCallback); //function(err, stdout, stderr, server, conn){
	ssh2_exec( pClientOpts, pCmd, pCallback);
};

SSHClient.prototype.writeFile = function( pClientOpts, pFilename, pContent, pCallback ) {
	if ( pClientOpts.privateKey && Fs.existsSync( pClientOpts.privateKey ) ) {
		pClientOpts.privateKey = Fs.readFileSync( pClientOpts.privateKey, {encoding: 'utf8'});
	}
	//SSH2Utils.writeFile( pClientOpts, pFilename, pContent, pCallback );
	ssh2_writeToFile( pClientOpts, pFilename, pContent, pCallback ) ;
};


exports = module.exports = SSHClient;
