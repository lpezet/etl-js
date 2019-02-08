const winston = require('winston');
const Fs = require('fs');
const Promises = require('./promises');

ModClass = function( pETL, pSettings ) {
	this.mSettings = pSettings || {};
	var that = this;
	if( pETL ) pETL.mod( 'mysqls', this, function( pSettings ) {
		that.mSettings = pSettings;
	});
}

ModClass.prototype._apply_settings = function( pParent, pKey, pConfig ) {
	//console.log('###### Before applying settings...');
	//console.dir( pConfig );
	
	var apply_settings = function( pConfig, pSettings ) {
		for (var i in pSettings) {
			if ( pConfig[i] == null ) pConfig[i] = pSettings[i];
		}
	}
	if ( this.mSettings[ pKey ] ) apply_settings( pConfig, this.mSettings[ pKey ] );
	else if ( this.mSettings[ pParent ] ) apply_settings( pConfig, this.mSettings[ pParent ] );
	else if ( this.mSettings[ '*' ] ) apply_settings( pConfig, this.mSettings[ '*' ] );
	
	//console.log('###### AFTER applying settings...');
	//console.dir( pConfig );
	
}

ModClass.prototype._read_options = function( pParent, pKey, pConfig ) {
	var oOptions = {
		bind_address: null,
		columns: null,
		compress: null,
		debug: null,
		debug_check: null,
		debug_info: null,
		default_auth: null,
		default_character_set: null,
		defaults_extra_file: null,
		defaults_file: null,
		defaults_group_suffix: null,
		delete: null,
		enable_cleartext_plugin: null,
		fields_enclosed_by: null,
		fields_escaped_by: null,
		fields_optionally_enclosed_by: null,
		fields_terminated_by: null,
		force: null,
		get_server_public_key: null,
		host: null,
		ignore: null,
		ignore_lines: null,
		lines_terminated_by: null,
		local: true,
		lock_tables: null,
		login_path: null,
		low_priority: null,
		no_defaults: null,
		password: null,
		pipe: null,
		plugin_dir: null,
		port: null,
		protocol: null,
		replace: null,
		secure_auth: null,
		server_public_key_path: null,
		shared_memory_base_name: null,
		silent: null,
		socket: null,
		ssl_ca: null,
		ssl_capath: null,
		ssl_cert: null,
		ssl_cipher: null,
		ssl_crl: null,
		ssl_crlpath: null,
		ssl_fips_mode: null,
		ssl_key: null,
		ssl_mode: null,
		tls_cipheruites: null,
		tls_version: null,
		use_threads: null,
		user: null
	}
	
	// WARNING: defaults will be affected here, don't make it a global thing, or change logic here, by first copying defaults into empty object.
	var oConfig = oOptions;
	for (var i in pConfig) {
		oConfig[ i.toLowerCase() ] = pConfig[i];
	}
	
	this._apply_settings( pParent, pKey, oConfig);
	
	return oConfig;
}


ModClass.prototype._wrap_run = function( pParent, pKey, pConfig, pExecutor ) {
	var that = this;
	return function() { 
		winston.log('debug', '[%s] Executing mysqlimport...', pParent );
		try {
			return that._run( pParent, pKey, pConfig, pExecutor );
		} catch (e) {
			winston.log('error', '[%s] Error executing mysqlimport.', pParent );
		} finally {
			winston.log('debug', '[%s] Done executing mysqlimport.', pParent );
		}
	};
}

ModClass.prototype._run = function( pParent, pKey, pConfig, pExecutor ) {
	return new Promise( function( resolve, reject ) {
		var enclose = function( pValue ) {
			if ( pValue.indexOf('"') >= 0) {
				return "'" + pValue + "'";
			} else if ( pValue.indexOf("'") >= 0 ) {
				return '"' + pValue + '"';
			}
			return '"' + pValue + '"';
		}
		var escape_single_quotes = function( pValue ) {
			return pValue.replace(/'/g, "\\'");
		}
		try {
			var oCmdArgs = [];
			for ( var i in pConfig ) {
				if ( pConfig[i] == null ) continue;
				switch (i) {
					case "auto_rehash":
						if ( pConfig[i] ) oCmdArgs.push("--auto-rehash");
					    break;
					case "auto_vertical_output":
						if ( pConfig[i] ) oCmdArgs.push("--auto-vertical-output");
					    break;
					case "batch":
						if ( pConfig[i] ) oCmdArgs.push("--batch");
					    break;
					case "binary_as_hex":
						if ( pConfig[i] ) oCmdArgs.push("--binary-as-hex");
					    break;
					case "binary_mode":
						if ( pConfig[i] ) oCmdArgs.push("--binary-mode");
					    break;
					case "bind_address":
					    oCmdArgs.push("--bind-address=" + pConfig[i]);
					    break;
					case "character_sets_dir":
						oCmdArgs.push("--character-sets-dir=" + pConfig[i]);
					    break;
					case "column_names":
					    oCmdArgs.push("--columns=" + pConfig[i]);
					    break;
					case "column_type_info":
						if ( pConfig[i] ) oCmdArgs.push("--column-type-info");
					    break;
					case "comments":
						if ( pConfig[i] ) oCmdArgs.push("--comments");
					    break;
					case "compress":
					    if ( pConfig[i] ) oCmdArgs.push("--compress");
					    break;
					case "connect_expired_password":
						if ( pConfig[i] ) oCmdArgs.push("--connect-expired-password");
					    break;
					case "connect_timeout":
						oCmdArgs.push("--connect_timeout=" + pConfig[i]);
					    break;
					//case "database":	
					case "debug":
					    oCmdArgs.push("--debug=" + pConfig[i]);
					    break;
					case "debug_check":
					    if ( pConfig[i] ) oCmdArgs.push("--debug-check");
					    break;
					case "debug_info":
						if ( pConfig[i] ) oCmdArgs.push("--debug-info");
					    break;
					case "default_auth":
					    oCmdArgs.push("--default-auth=" + pConfig[i]);
					    break;
					case "default_character_set":
					    oCmdArgs.push("--default-character-set=" + pConfig[i]);
					    break;
					case "defaults_extra_file":
					    oCmdArgs.push("--defaults-extra-file=" + pConfig[i]);
					    break;
					case "defaults_file":
					    oCmdArgs.push("--defaults-file=" + pConfig[i]);
					    break;
					case "defaults_group_suffix":
					    oCmdArgs.push("--defaults-group-suffix=" + pConfig[i]);
					    break;
					case "delimiter":
						oCmdArgs.push("--delimiter=" + pConfig[i]);
					    break;	
					case "enable_cleartext_plugin":
						if ( pConfig[i] ) oCmdArgs.push("--enable-cleartext-plugin");
					    break;
					case "execute":
						// TODO: need to escape?
						oCmdArgs.push("--execute='" + escape_single_quotes( pConfig[i] ) + "'");
					    break;
					case "force":
						if ( pConfig[i] ) oCmdArgs.push("--force");
					    break;
					case "get_server_public_key":
						if ( pConfig[i] ) oCmdArgs.push("--get-server-public-key");
					    break;
					case "host":
					    oCmdArgs.push("--host=" + pConfig[i]);
					    break;
					case "html":
						if ( pConfig[i] ) oCmdArgs.push("--html");
					    break;
					case "ignore_spaces":
						if ( pConfig[i] ) oCmdArgs.push("--ignore-spaces");
					    break;
					//case "init_command":
					case "line_numbers":
						if ( pConfig[i] ) oCmdArgs.push("--line-numbers");
					    break;
					case "local_infile":
						oCmdArgs.push("--local-infile=" + pConfig[i]);
					    break;
					case "login_path":
					    oCmdArgs.push("--login-path=" + pConfig[i]);
					    break;
					case "max_allowed_packet":
						oCmdArgs.push("--max_allowed_packet=" + pConfig[i]);
					    break;
					case "max_join_size":
						oCmdArgs.push("--max_join_size=" + pConfig[i]);
					    break;
					case "named_commands":
						if ( pConfig[i] ) oCmdArgs.push("--named-commands");
					    break;
					case "net_buffer_length":
						oCmdArgs.push("--net_buffer_length=" + pConfig[i]);
					    break;
					case "no_auto_rehash":
						if ( pConfig[i] ) oCmdArgs.push("--no-auto-rehash");
					    break;
					case "no_beep":
						if ( pConfig[i] ) oCmdArgs.push("--no-beep");
					    break;
					case "no_defaults":
						if ( pConfig[i] ) oCmdArgs.push("--no-defaults");
					    break;
					case "one_database":
						if ( pConfig[i] ) oCmdArgs.push("--one-database");
					    break;
					case "pager":
						oCmdArgs.push("--pager=" + pConfig[i]);
					    break;
					case "password":
					    oCmdArgs.push("--password=" + pConfig[i]);
					    break;
					case "pipe":
						if ( pConfig[i] ) oCmdArgs.push("--pipe");
					    break;
					case "plugin_dir":
					    oCmdArgs.push("--plugin-dir=" + pConfig[i]);
					    break;
					case "port":
					    oCmdArgs.push("--port=" + pConfig[i]);
					    break;
					//case "print-defaults":
					//case "prompt": // ???
					case "protocol":
					    oCmdArgs.push("--protocol=" + pConfig[i]);
					    break;
					case "quick":
						if ( pConfig[i] ) oCmdArgs.push("--quick");
					    break;
					case "raw":
						if ( pConfig[i] ) oCmdArgs.push("--raw");
					    break;
					case "reconnect":
						if ( pConfig[i] ) oCmdArgs.push("--reconnect");
					    break;
					case "i_am_a_dummy":
						if ( pConfig[i] ) oCmdArgs.push("--i-am-a-dummy");
					    break;
					case "safe_updates":
						if ( pConfig[i] ) oCmdArgs.push("--safe-updates");
					    break;
					case "secure_auth":
						if ( pConfig[i] ) oCmdArgs.push("--secure-auth");
					    break;
					case "select_limit":
						oCmdArgs.push("--select_limit=" + pConfig[i]);
					    break;
					case "server_public_key_path":
					    oCmdArgs.push("--server-public-key-path=" + pConfig[i]);
					    break;
					case "shared_memory_base_name":
					    oCmdArgs.push("--shared-memory-base-name=" + pConfig[i]);
					    break;
					case "show_warnings":
						if ( pConfig[i] ) oCmdArgs.push("--show-warnings");
					    break;
					case "sigint_ignore":
						if ( pConfig[i] ) oCmdArgs.push("--sigint-ignore");
					    break;
					case "silent":
						if ( pConfig[i] ) oCmdArgs.push("--silent");
					    break;
					case "skip_auto_rehash":
						if ( pConfig[i] ) oCmdArgs.push("--skip-auto-rehash");
						break;
					case "skip_column_names":
						if ( pConfig[i] ) oCmdArgs.push("--skip-column-names");
						break;
					case "skip_line_numbers":
						if ( pConfig[i] ) oCmdArgs.push("--skip-line-numbers");
						break;
					case "skip_named_commands":
						if ( pConfig[i] ) oCmdArgs.push("--skip-named-commands");
						break;
					case "skip_pager":
						if ( pConfig[i] ) oCmdArgs.push("--skip-pager");
						break;
					case "skip_reconnect":
						if ( pConfig[i] ) oCmdArgs.push("--skip-reconnect");
						break;
					case "socket":
					    oCmdArgs.push("--socket=" + pConfig[i]);
					    break;
					case "ssl_ca":
					    oCmdArgs.push("--ssl-ca=" + pConfig[i]);
					    break;
					case "ssl_capath":
					    oCmdArgs.push("--ssl-capath=" + pConfig[i]);
					    break;
					case "ssl_cert":
					    oCmdArgs.push("--ssl-cert=" + pConfig[i]);
					    break;
					case "ssl_cipher":
					    oCmdArgs.push("--ssl-cipher=" + pConfig[i]);
					    break;
					case "ssl_crl":
					    oCmdArgs.push("--ssl-crl=" + pConfig[i]);
					    break;
					case "ssl_crlpath":
					    oCmdArgs.push("--ssl-crlpath=" + pConfig[i]);
					    break;
					case "ssl_fips_mode":
					    oCmdArgs.push("--ssl-fips_mode=" + pConfig[i]);
					    break;
					case "ssl_key":
					    oCmdArgs.push("--ssl-key=" + pConfig[i]);
					    break;
					case "ssl_mode":
					    oCmdArgs.push("--ssl-mode=" + pConfig[i]);
					    break;
					case "syslog":
						if ( pConfig[i] ) oCmdArgs.push("--syslog");
						break;
					case "table":
						if ( pConfig[i] ) oCmdArgs.push("--table");
						break;
					case "tee":
						oCmdArgs.push("--tee=" + pConfig[i]);
					    break;
					case "tls_cipheruites":
					    oCmdArgs.push("--tls-cipheruites=" + pConfig[i]);
					    break;
					case "tls_version":
					    oCmdArgs.push("--tls-version=" + pConfig[i]);
					    break;
					case "unbuffered":
						if ( pConfig[i] ) oCmdArgs.push("--unbuffered");
						break;
					case "user":
					    oCmdArgs.push("--user=" + pConfig[i]);
					    break;
					case "vertical":
						if ( pConfig[i] ) oCmdArgs.push("--vertical");
						break;
					case "wait":
						if ( pConfig[i] ) oCmdArgs.push("--wait");
						break;
					case "xml":
						if ( pConfig[i] ) oCmdArgs.push("--xml");
						break;
					default:
						//TODO
						break;
				}
				//console.log('i=' + i + ', config=' + pConfig[i]);
			}
			
			oCmdArgs.push( pConfig[ 'db_name' ] );
			//oCmdArgs.push( pKey );
			//TODO: if "table_name" given in config, maybe rename file before running mysqlimport command...or so a "ln -s" maybe???
			var oEnsureFolderExists = '[ ! -d $(dirname "' + pKey + '") ] && mkdir -p $(dirname "' + pKey + '");';
			var oCmd = oEnsureFolderExists + "/usr/bin/mysql " + oCmdArgs.join(' ');
			pExecutor.exec( oCmd, { context: pKey }, function( error, stdout, stderr ) {
				winston.log('debug', '[%s] Done executing mysql.', pParent);
				if ( error ) {
					winston.log('error', '[%s] Error executing mysql.', pParent, error);
					reject( error );
				} else {
					resolve( stdout );
				}
			});
		} catch (e) {
			reject( e );
			winston.log('error', '[%s] Unexpected error running mysqlimport.', pParent, e);
		}
	});
}

ModClass.prototype.handle = function( pParent, pConfig, pExecutor ) {
	var that = this;
	return new Promise( function( resolve, reject ) {
		winston.log('info', '[%s] Processing mysqls...', pParent);
		try {
			var oPromises = [];
			
			for (var i in pConfig) {
				var oOptions = that._read_options( pParent, i, pConfig[i] );
				oPromises.push( that._wrap_run( pParent, i, oOptions, pExecutor ) );
			}
			Promises.seqConcatResults( oPromises ).then(function( pData ) {
				winston.log('info', '[%s] Done running mysqls.', pParent);
				resolve( pData );
			}, function( pError ) {
				winston.log('error', '[%s] Error running mysqls.', pParent, pError);
				reject( pError );
				
			});
		} catch (e) {
			reject( e );
			winston.log('error', '[%s] Unexpected error running mysqls.', pParent, e);
		}
	});
}



exports = module.exports = ModClass;