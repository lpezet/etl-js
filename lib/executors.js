const SSHClientClass = require('./ssh-client');
const SSHClient = new SSHClientClass();
const child_process = require('child_process')
const Fs = require('fs');
const SimpleLogger = require('./logger');


LocalClass = function( pSettings, pLogger ) {
	this.mSettings = pSettings;
	this.mLogger = pLogger ? pLogger : new SimpleLogger();
}

LocalClass.prototype.exec = function( pCmd, pCmdOptions, pCallback ) {
	var that = this;
	this.mLogger.debug('Executing command [%s] locally...', pCmd);
	child_process.exec( pCmd, pCmdOptions, function( error, stdout, stderr ) {
		that.mLogger.debug('Done executing command [%s] locally.', pCmd);
		stdout = Buffer.isBuffer( stdout ) ? stdout.toString('utf8') : stdout;
		stderr = Buffer.isBuffer( stderr ) ? stderr.toString('utf8') : stderr;
		pCallback( error, stdout, stderr);
	} );
};

LocalClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
	var that = this;
	Fs.writeFile( pFilename, pContent, function(err) {
		if ( err ) {
			that.mLogger.error('Error writing content to local file [%s].', pFilename, err);
			pCallback( err, "", "" );
		} else {
			that.mLogger.debug('Successfully wrote content to local file [%s].', pFilename);
			pCallback( null, "", "" );
		}
	});
};

RemoteClass = function( pSettings, pLogger ) {
	this.mSettings = pSettings;
	this.mLogger = pLogger ? pLogger : new SimpleLogger();
};

RemoteClass.prototype._get_ssh_opts = function() {
	var opts = {
		host: this.mSettings.host, // e.g. '192.168.99.100',
		port: (this.mSettings.port || 22),
		username: this.mSettings.username
	};
	if ( this.mSettings['privateKey'] ) {
		opts['privateKey'] = this.mSettings['privateKey'];
	} else if ( this.mSettings['password'] ) {
		opts['password'] = this.mSettings['password'];
	};
	
	return opts;
};

RemoteClass.prototype.exec = function( pCmd, pCmdOptions, pCallback ) {
	this.mLogger.debug('Executing command [%s] remotely on [%s]...', pCmd, this.mSettings.host);
	const opts = this._get_ssh_opts();
	if ( pCmdOptions['env'] ) opts['env'] = pCmdOptions['env'];
	var oCmd = pCmd;
	if ( pCmdOptions['cwd'] ) {
		oCmd = 'cd ' + pCmdOptions['cwd'] + '; ' + oCmd;
		this.mLogger.debug('Changing directory. New command to execute remotely: [%s]', oCmd);
	}
	var that = this;
	SSHClient.exec( opts, oCmd, function(err, stdout, stderr, server, conn){
		try {
			stdout = Buffer.isBuffer( stdout ) ? stdout.toString('utf8') : stdout;
			stderr = Buffer.isBuffer( stderr ) ? stderr.toString('utf8') : stderr;
			that.mLogger.debug('Command [%s] executed remotely.', pCmd);
			pCallback( err, stdout, stderr );
		} finally {
			if ( conn ) {
				conn.end();
			}
		}
	});
	
};

RemoteClass.prototype.writeFile = function( pFilename, pContent, pCallback ) {
	this.mLogger.debug('Writing content to remote file [%s]...', pFilename);
	const opts = this._get_ssh_opts();
	var that = this;
	
	SSHClient.writeFile( opts, pFilename, pContent, function( err, stdout, stderr, server, conn ) {
		try {
			if ( err ) {
				that.mLogger.error('Error writing content to remote file [%s].', pFilename, err);
				pCallback( err, "", "" );
			} else {
				that.mLogger.debug('Successfully wrote content to remote file [%s].', pFilename);
				pCallback( null, "", "" );
			}
		} finally {
			if ( conn ) {
				conn.end();
			}
		}
	});
};

exports = module.exports = {
	local: LocalClass,
	remote: RemoteClass
};
