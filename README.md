# ETL JS

# Overview

ETL JS is to ETL what AWS CloudFormation is to cloud computing.
With ETL JS, you define activities in YAML and run it to extract, transform, load data and more!

# Getting Started

## Installation

```nodejs
npm i @lpezet/etl-js
```

## TL;DR

```yaml
etl:
  - sayhello

sayhello:
  commands:
    001_hello:
      command: echo "hello"
```


```nodejs
const Fs = require('fs');
const ETLClass = require('@lpezet/etl-js');
const RemoteExecutorClass = require('@lpezet/etl-js/lib/executors').remote;
// or any other yaml parser
const { yamlParse } = require('yaml-cfn');

const executorSettings = {
	host: '1.2.3.4',
	username: 'hello',
	privateKey: Fs.readFileSync('/here/is/my/key')
}

const executor = new RemoteExecutorClass( settings );
const etl = new ETLClass( executor );

const specs = yamlParse( Fs.readFileSync( '/somewhere/etl.yml', {encoding: 'utf8'} ) );

etl.process( specs );
```

# Concepts

If you're familiar with CloudFormation templates, then you will feel right at home here!
If not, don't worry, it's easy.


# Executors (how to execute)

Mods actually delegate the actual actions (mostly shell commands) to an Executor.
This is nothing more than an object with a couple functions in it, in charge of executing certain commands and calling back the mod to continue (or not) the activity.

Two Executors are provided in the `executors` module.

## Local

```nodejs
const LocalExecutorClass = require('etl-js/executors').local;

var executor = new LocalExecutorClass();

```

This executor will simply delegate to `child_process` and execute commands locally.


## Remote

```nodejs
const RemoteExecutorClass = require('etl-js/executors').remote;

settings = {
	host: '1.2.3.4',
	username: 'username',
	password: 'password'
	privateKey: fs.readFileSync('/here/is/my/key')
}

var executor = new RemoteExecutorClass( settings );

```

This executor will execute commands on a remote server (as defined in `settings`) through `ssh`.


# Mods (Activities)

Activities are carried by what's called "mods" here. For example, executing a command (e.g. "echo 'hello world!'") is done by the `commands` mod.
Downloading a file is done by the `files` mod.

Take this snippet of an ETL template:

```yaml
my_extract:
  files:
    "/downloads/file1.zip":
      source: https://a.b.c/file1.zip
  commands:
    001_unzip;
      command: unzip file1.zip
      cwd: /downloads/
```

This template will basically download a file from `https://a.b.c/file1.zip` to `/downloads/file1.zip`, and then run `unzip file1.zip` in the directory `/downloads/`.
All this defines the **my_extract** activity. You can of course define more activities.

Here's another example to load files into an HPCC Thor Cluster.

```yaml
my_load:
  sprays:
    "test::file1"
      format: csv
      sourcePath: /downloads/file1.csv
      destinationGroup: "mythor"
      allowoverwrite: true
      failIfNoSourceFile: true
```
In this new activity, we're loading (spraying, in HPCC *parlance*) a CSV file and giving it a logical name of `test::file1`.
This defines **my_load** activity.

Here's what the full ETL template then would look like with those two activities:

```yaml
etl:
  - my_extract
  - my_load

my_extract:
  files:
    "/downloads/file1.zip":
      source: https://a.b.c/file1.zip
  commands:
    001_unzip;
      command: unzip file1.zip
      cwd: /downloads/

my_load:
  sprays:
    "test::file1"
      format: csv
      sourcePath: /downloads/file1.csv
      destinationGroup: "mythor"
      allowoverwrite: true
      failIfNoSourceFile: true
```

## Basic mods

### files

#### Specs

```yaml
root:
  files:
    "_output_full_file_path_":
      source: _url_
```

#### Description

This mod simply downloads files.

The template below will simply downloads the file from `https://a.b.c/file1.zip` to `/downloads/file1.zip`.

```yaml
my_extract:
  files:
    "/downloads/file1.zip":
      source: https://a.b.c/file1.zip
```


### commands

#### Specs

```yaml
root:
  commands:
    _key_:
      command: _command_
      cwd: _cwd_
      test: _test_
```

#### Description

This mod execute commands.

The template below runs `echo "hello"`.

```yaml
my_commands:
  commands:
    000_say_hello:
      command: echo "hello"
```



## HPCC Systems mods

### ecls

#### Specs

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

#### Description

This mod execute ECL code against an HPCC System cluster.


### sprays

#### Specs

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

#### Description

Use the HPCC Systems Distributed File Utility (DFU) (`dfuplus`) to load file into HPCC Systems Cluster.


## MySQL mods

### mysqlimports

#### Specs

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

#### Description


Imports file into MySQL database through `mysqlimport`.

