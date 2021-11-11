# Mods

Each Mod provide some functionality useful to an ETL process. For examples, the Commands Mod will provide the ability to run commands on either the host or the client, to unzip files, run scripts, etc. The Files Mod is useful to download files from ftp servers, over http/https, etc.

# Table of contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Basic Mods](#basic-mods)
  - [Interactives Mod](#interactives-mod)
    - [Installation/Dependencies](#installationdependencies)
    - [Specs](#specs)
    - [Examples](#examples)
  - [Files Mod](#files-mod)
    - [Installation/Dependencies](#installationdependencies-1)
    - [Specs](#specs-1)
    - [Examples](#examples-1)
  - [Commands Mod](#commands-mod)
    - [Installation/Dependencies](#installationdependencies-2)
    - [Specs](#specs-2)
    - [Examples](#examples-2)
- [HPCC Systems mods](#hpcc-systems-mods)
  - [ECLs Mod](#ecls-mod)
    - [Installation/Dependencies](#installationdependencies-3)
    - [Specs](#specs-3)
    - [Examples](#examples-3)
  - [Sprays Mod](#sprays-mod)
    - [Installation/Dependencies](#installationdependencies-4)
    - [Specs](#specs-4)
    - [Examples](#examples-4)
- [MySQL Mods](#mysql-mods)
  - [MySQLs Mod](#mysqls-mod)
    - [Installation/Dependencies](#installationdependencies-5)
    - [Specs](#specs-5)
  - [MySQLImports Mod](#mysqlimports-mod)
    - [Installation/Dependencies](#installationdependencies-6)
    - [Specs](#specs-6)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Basic Mods

## Interactives Mod

This mod will prompt user to enter something.

### Installation/Dependencies

None. Simply leverages `readline` to prompt message and read answer.

### Specs

```yaml
root:
  interactives:
    sayhello:
      prompt: _prompt_
      var: _key_
```

### Examples

```yaml
root:
  interactives:
    sayhello:
      prompt: "Name please:"
      var: "name"
```

## Files Mod

This mod simply downloads files.

### Installation/Dependencies

This mods uses `wget` to make download files.
Other aspects (like permissions) are done through bash commands (`chmod`, `chown`, `chgrp`).

### Specs

```yaml
root:
  files:
    "_output_full_file_path_":
      source: _url_
```

### Examples

The template below will simply downloads the file from `https://a.b.c/file1.zip` to `/downloads/file1.zip`.

```yaml
my_extract:
  files:
    "/downloads/file1.zip":
      source: https://a.b.c/file1.zip
```

## Commands Mod

You can use the Commands Mod to execute commands. Commands are executed in the order provided.

### Installation/Dependencies

None. This mod simply provides access to bash environment.

### Specs

| Property           | Required? | Default value | Description                                                                                                                                                                                                                                                                                               |
| ------------------ | --------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **command**        | required  |               | String specifying the command to run. Tags can be used                                                                                                                                                                                                                                                    |
| **cwd**            | optional  |               | Working directory                                                                                                                                                                                                                                                                                         |
| **env**            | optional  |               | Sets environment variables for the command. This property overwrites, rather than appends, the existing environment.                                                                                                                                                                                      |
| **test**           | optional  |               | A test command that determines whether to run the **command** specified. If the test fails (or in error, based on exit code), the **command** is skipped. For Linux, the test command must return an exit code of 0 for the test to pass. For Windows, the test command must return an %ERRORLEVEL% of 0. |
| **ignore_errors**  | optional  | false         | If true, errors when executing **command** (not the test) are ignored and process continues as if **command** executed fine.                                                                                                                                                                              |
| **exit_on_error**  | optional  | false         | Whether or not to exit the entire process upon error.                                                                                                                                                                                                                                                     |
| **var**            | optional  |               | Save result of command into context under **var** key.                                                                                                                                                                                                                                                    |
| **result_as_json** | optional  | false         | Whether or not to parse **command** result (stdout) as JSON. This can be used with **var** to save JSON into context and make it available to other mods.                                                                                                                                                 |

Note that, if the command used in **test** is in error, the command will be skipped. This means both **ignore_errors** and **exit_on_error** are ignored in this situation.

### Examples

The template below runs `echo "hello"`.

```yaml
commands:
  000_say_hello:
    command: echo "hello"
```

The following template will first run a test to decide whether or not to run the command:

```yaml
commands:
  000_say_hello:
    command: echo "Now do something"
    test: [$((`date +%d`%2)) -eq 0]
```

The following template make use of the **var** property to use the value in a subsequent command:

```yaml
commands:
  000_figure_out_day:
    command: date +%A
    var: today
  001_printit:
    command: echo "Today is {{today}}"
```

The following template make use of both **var** and **result_as_json**:

```yaml
commands:
  000_var:
    command: echo '{ "toto":"titi" }'
    var: myvar
    result_as_json: true
  001_use:
    command: echo "According to myvar, toto={{myvar.toto}}"
```

To prevent the executing of the process, whatever the reason, a simple script exiting with an exit code different from 0 will do:

```yaml
commands:
  000_pre_flight_check:
    command: /opt/something/check_for_new_data.sh
    exit_on_error: true
```

# HPCC Systems mods

## ECLs Mod

This mod execute ECL code against an HPCC System cluster.

### Installation/Dependencies

This mods requires [HPCC ECL Client Tools](https://hpccsystems.com/download#HPCC-Platform).
The program `eclplus`, specifically, is used here.

### Specs

```yaml
root:
  ecls:
    _key_:
      # required
      cluster: _cluster_,
      # one or the other, required
      content: _ecl_,
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

### Examples

The following example runs `OUTPUT('Hello world!)` on the cluster:

```yaml
root:
  ecls:
    output_hello:
      # required
      cluster: thor,
      content: |
        OUTPUT('Hello world!')
```

The following example will generate a CSV file with headers:

```yaml
root:
  ecls:
    output_hello:
      # required
      cluster: thor,
      output: /tmp/test.csv
      format: csvh
      content: |
        layout := RECORD
          STRING name;
          STRING num;
        END;
        ds := DATASET([ { 'Toto', 4 }, { 'Titi', 4 }, ( 'Anderson', 8 } ], layout );
        OUTPUT(ds);
```

## Sprays Mod

Use the HPCC Systems Distributed File Utility (DFU) (`dfuplus`) to load file into HPCC Systems Cluster.

### Installation/Dependencies

This mods requires [HPCC ECL Client Tools](https://hpccsystems.com/download#HPCC-Platform).
The program `dfuplus`, specifically, is used here.

### Specs

```yaml
root:
  hpcc-sprays:
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

### Examples

The following example sprays the file `/tmp/2018.csv` onto the cluster:

```yaml
load:
  hpcc-sprays:
    "noaa::ghcn::daily::2018::raw":
      format: csv
      destinationGroup: "mythor"
      allowoverwrite: true
      sourcePath: /tmp/2018.csv
```

# MySQL Mods

## MySQLs Mod

This mod can be used to query a MySQL database.

### Installation/Dependencies

This mods requires [MySQL client](https://dev.mysql.com/doc/refman/8.0/en/programs-client.html).
The program `mysql`, specifically, is used here.

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
    output: _file_to_output_results_to
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

### Examples

Querying some records and saving the results in a file:

```yaml
query:
  mysqls:
    user_report:
      db_name: reports
      execute: |
        SELECT
          email,
          COUNT(DISTINCT(attempts)) as total_attempts,
          SUM(IF(failed,1,0)) as total_failed_attempts
        FROM
          user_logs;
      output: /opt/example/user_reports.txt
```

Creating a table (no output necessary):

```yaml
ddl:
  mysqls:
    create_users_tables:
      db_name: idp
      execute: |
        DROP TABLE IF EXISTS users;
        CREATE TABLE users (id BIGINT NOT NULL PRIMARY KEY, email VARCHAR(200), first_name VARCHAR(255), last_name VARCHAR(255), UNIQUE INDEX (email));
```

## MySQLImports Mod

Imports file into MySQL database through `mysqlimport`.

### Installation/Dependencies

This mods requires [MySQL client](https://dev.mysql.com/doc/refman/8.0/en/programs-client.html).
The program `mysqlimport`, specifically, is used here.

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
