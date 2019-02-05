const SSH2UtilsClass = require('ssh2-utils');
const SSH2Utils = new SSH2UtilsClass;
const child_process = require('child_process')
const winston = require('winston');
const Fs = require('fs');
//const path = require('path');


LocalClass = function( pSettings ) {
	this.mSettings = pSettings;
}

LocalClass.prototype.exec = function( pCmd, pCmdOptions, pCallback ) {
	winston.log('debug', 'Executing command [%s] locally...', pCmd);
	child_process.exec( pCmd, pCmdOpts, function( error, stdout, stderr ) {
		winston.log('debug', 'Done executing command [%s] locally.', pCmd);
		pCallback( error, stdout, stderr);
	} );
};


LocalClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
	Fs.writeFile( pFilename, pContent, function(err) {
		try {
			if ( err ) {
				winston.log('error', 'Error writing content to local file [%s].', pFilename, err);
				pCallback( err, "", "" );
			} else {
				winston.log('debug', 'Successfully wrote content to local file [%s].', pFilename);
				pCallback( null, "", "" );
			}
		} catch(e) {
			winston.log('error', 'Unexpected error writing content to local file [%s].', pFilename, e);
		}
	});
};


RemoteClass = function( pSettings ) {
	this.mSettings = pSettings;
}

RemoteClass.prototype._get_ssh_opts = function() {
	var opts = {
		host: this.mSettings.host, // e.g. '192.168.99.100',
		username: this.mSettings.username
	};
	if ( this.mSettings['privateKey'] ) {
		opts['privateKey'] = this.mSettings['privateKey'];
	} else if ( this.mSettings['password'] )
		opts['password'] = this.mSettings['password'];
	};
	
	return opts;
}

RemoteClass.prototype.exec = function( pCmd, pCmdOptions, pCallback ) {
	winston.log('debug', 'Executing command [%s] remotely on [%s]...', pCmd, this.mSettings.host);
	
	const opts = _get_ssh_opts();
	
	if ( pCmdOptions['env'] ) oOpts['env'] = pCmdOptions['env'];
	
	var oCmd = pCmd;
	if ( pCmdOptions['cwd'] ) {
		oCmd = 'cd ' + pCmdOptions['cwd'] + '; ' + oCmd;
		winston.log('debug', 'Changing directory. New command to execute remotely: [%s]', oCmd);
	}
	
	//winston.log('debug', 'Executing command [%s]...', pCmd);
	/*
	ssh
		.exec(this.mSettings.host, oCmd, oOpts)
		.then(function( pOutput ) {
			winston.log('debug', 'Successfully executed command [%s] remotely.', pCmd);
			pCallback( null, pOutput, "" );
		})
		.catch(function(err) {
			winston.log('error', 'Error running command [%s] remotely.', pCmd, err);
			 pCallback( { code: 1, message: err }, "", err );
		});
	*/
	SSH2Utils.exec( opts, oCmd, function(err, stdout, stderr, server, conn){
		try {
			winston.log('debug', 'Command [%s] executed remotely.', pCmd);
			pCallback( err, stdout, stderr );
		} finally {
			if ( conn ) conn.end();
		}
	});
	
};

RemoteClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
	winston.log('debug', 'Writing content to remote file [%s]...', pFilename);
	const opts = _get_ssh_opts();
	
	SSH2Utils.writeFile( opts, pFilename, pContent, function( err, server, conn ) {
		try {
			if ( err ) {
				winston.log('error', 'Error writing content to remote file [%s].', pFilename, err);
				pCallback( err, "", "" );
			} else {
				winston.log('debug', 'Successfully wrote content to remote file [%s].', pFilename);
				pCallback( null, "", "" );
			}
		} catch(e) {
			winston.log('error', 'Unexpected error writing content to remote file [%s].', pFilename, e);
		} finally {
			if ( conn ) conn.end();
		}
	});
};



exports = module.exports = {
	local: LocalClass,
	remote: RemoteClass
}