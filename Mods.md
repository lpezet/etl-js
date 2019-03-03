# Mods

Each Mod provide some functionality useful to an ETL process. For examples, the Commands Mod will provide the ability to run commands on either the host or the client, to unzip files, run scripts, etc. The Files Mod is useful to download files from ftp servers, over http/https, etc.

* [Basic](#basic-mods)
    * [Files Mod](#files-mod)
    * [Commands Mod](#commands-mod)
    
* [HPCC Systems](#hpcc-systems-mods)
    * [ECLs Mod](#ecls-mod)
    * [Sprays Mod](#sprays-mod)
    
* [MySQL](#mysql-mods)
    * [MySQLs Mod](#mysqls-mod)
    * [MySQLImports Mod](#mysqlimports-mod)


# Basic Mods

## Files Mod

### Specs

```yaml
root:
  files:
    "_output_full_file_path_":
      source: _url_
```

### Description

This mod simply downloads files.
The template below will simply downloads the file from `https://a.b.c/file1.zip` to `/downloads/file1.zip`.

```yaml
my_extract:
  files:
    "/downloads/file1.zip":
      source: https://a.b.c/file1.zip
```


## Commands Mod

### Specs

```yaml
root:
  commands:
    _key_:
      command: _command_
      cwd: _cwd_
      test: _test_
```

### Description

This mod execute commands.

The template below runs `echo "hello"`.

```yaml
my_commands:
  commands:
    000_say_hello:
      command: echo "hello"
```



# HPCC Systems mods

## ECLs Mod

### Specs

```yaml
root:
  ecls:
    _key_:
      # required
      cluster: _cluster_,
      # one or the other, required
      ecl: _ecl_,
      file: _file_,
      # optional
      queue: _queue_,
      graph: _graph_,
      timeout: _timeout_,
      format: _format_,
      output: _output_,
      jobname: _output_,
      pagesize: _pagesize_
```

### Description

This mod execute ECL code against an HPCC System cluster.


## Sprays Mod

### Specs

```yaml
root:
  sprays:
  	# required
    format: _format_,
    destinationgroup: null,
    destinationlogicalname: null,
    # usually defined in settings or in dfuplus.ini
    server: _server_,
    username: _username_,
    password: _password_,
    # optional
    sourceip: _sourceip_,
    sourcepath: _sourcepath_,
    maxrecordsize: _maxrecordsize_,
    srccsvseparator: _csvseparator_,
    srccsvterminator: _csvterminator_,
    srccsvquote: _csvquote_,
    timeout: _timeout_,
    maxconnections: _maxconnections_,
    allowoverwrite: _allowoverwrite_,
    replicate: _replicate_,
    compress: _compress_,
    sourcecsvescape: _sourcecsvescape_,
    failifnosourcefile: _failifnosourcefile_,
    recordstructurepresent: _recordstructurepresent_,
    quotedterminator: _quotedterminator_,
    encoding: _encoding_,
    expiredays: _expiredays_
```

### Description

Use the HPCC Systems Distributed File Utility (DFU) (`dfuplus`) to load file into HPCC Systems Cluster.


# MySQL Mods

## MySQLs Mod

### Specs


```yaml
root:
  mysqls:
    auto_rehash: _auto_rehash_
    auto_vertical_output: _auto_vertical_output_
    batch: _batch_
    binary_as_hex: _binary_as_hex_
    binary_mode: _binary_mode_
  	bind_address: _bind_address_
    
    v TODO v
  	columns: _columns_
    compress: _compress_
    debug: _debug_
    debug_check: _debug_check_
    debug_info: _debug_info_
    default_auth: _default_auth_
    default_character_set: _default_character_set_
    defaults_extra_file: _defaults_extra_file_
    defaults_file: defaults_file_
    defaults_group_suffix: _defaults_group_suffix_
    delete: _delete_
    enable_cleartext_plugin: _enable_cleartext_plugin_
    fields_enclosed_by: _fields_enclosed_by_
    fields_escaped_by: _fields_escaped_by_
    fields_optionally_enclosed_by: _fields_optionally_enclosed_by_
    fields_terminated_by: _fields_terminated_by_
    force: _force_
    get_server_public_key: _get_server_public_key_
    host: _host_
    ignore: _ignore_
    ignore_lines: _ignore_lines_
    lines_terminated_by: _lines_terminated_by_
    local: _local_
    lock_tables: _lock_tables_
    login_path: _login_path_
    low_priority: _low_priority_
    no_defaults: _no_defaults_
    password: _password_
    pipe: _pipe_
    plugin_dir: _plugin_dir_
    port: _port_
    protocol: _protocol_
    replace: _replace_
    secure_auth: _secure_auth_
    server_public_key_path: _server_public_key_path_
    shared_memory_base_name: _shared_memory_base_name_
    silent: _silent_
    ^ TODO ^
    
    skip_named_commands: _skip_named_commands_
    skip_pager: _skip_pager_
    skip_reconnect: _skip_reconnect_
    socket: _socket_
    ssl_ca: _ssl_ca_
    ssl_capath: _ssl_capath_
    ssl_cert: _ssl_cert_
    ssl_cipher: _ssl_cipher_
    ssl_crl: _ssl_crl_
    ssl_crlpath: _ssl_crlpath_
    ssl_fips_mode: _ssl_fips_mode_
    ssl_key: _ssl_key_
    ssl_mode: _ssl_mode_
    syslog: _syslog_
    table: _table_
    tee: _tee_
    tls_cipheruites: _tls_ciphersuites_
    tls_version: _tls_version_
    unbuffered: _unbuffered_
    user: _user_
    vertical: _vertical_
    wait: _wait_
    xml: _xml_
```

### Description

This mod can be used to query a MySQL database.


## MySQLImports Mod

### Specs

```yaml
root:
  mysqlimports:
    bind_address: _bind_address_
    columns: _columns_
    compress: _compress_
    debug: _debug_
    debug_check: _debug_check_
    debug_info: _debug_info_
    default_auth: _default_auth_
    default_character_set: _default_character_set_
    defaults_extra_file: _defaults_extra_file_
    defaults_file: defaults_file_
    defaults_group_suffix: _defaults_group_suffix_
    delete: _delete_
    enable_cleartext_plugin: _enable_cleartext_plugin_
    fields_enclosed_by: _fields_enclosed_by_
    fields_escaped_by: _fields_escaped_by_
    fields_optionally_enclosed_by: _fields_optionally_enclosed_by_
    fields_terminated_by: _fields_terminated_by_
    force: _force_
    get_server_public_key: _get_server_public_key_
    host: _host_
    ignore: _ignore_
    ignore_lines: _ignore_lines_
    lines_terminated_by: _lines_terminated_by_
    local: _local_
    lock_tables: _lock_tables_
    login_path: _login_path_
    low_priority: _low_priority_
    no_defaults: _no_defaults_
    password: _password_
    pipe: _pipe_
    plugin_dir: _plugin_dir_
    port: _port_
    protocol: _protocol_
    replace: _replace_
    secure_auth: _secure_auth_
    server_public_key_path: _server_public_key_path_
    shared_memory_base_name: _shared_memory_base_name_
    silent: _silent_
    socket: _socket_
    ssl_ca: _ssl_ca_
    ssl_capath: _ssl_capath_
    ssl_cert: _ssl_cert_
    ssl_cipher: _ssl_cipher_
    ssl_crl: _ssl_crl_
    ssl_crlpath: _ssl_crlpath_
    ssl_fips_mode: _ssl_fips_mode_
    ssl_key: _ssl_key_
    ssl_mode: _ssl_mode_
    tls_cipheruites: _tls_ciphersuites_
    tls_version: _tls_version_
    use_threads: _use_threads_
    user: _user_
```

### Description


Imports file into MySQL database through `mysqlimport`.
