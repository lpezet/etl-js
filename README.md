# ETL JS

# Overview

ETL JS is to ETL what AWS CloudFormation is to cloud computing.
With ETL JS, you define activities in YAML and run it to extract, transform, load data and more!

# Getting Started

npm install etl-js

## Installation

## TL;DR


# Concepts

If you're familiar with CloudFormation templates, then you will feel right at home here!
If not, don't worry, it's easy.

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
This define **my_load** activity.

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

# Executors (how to execute)

Mods actually delegate the actual actions (mostly shell commands) to an Executor.
This is nothing more than an object with a couple functions in it, in charge of executing certain commands and calling back the mod to continue (or not) the activity.

Two Executors are provided in the `executors` module.

## Local

```nodejs
const LocalExecutorClass = require('etl-js/executors').local;

var executor = new LocalExecutorClass();

```

This executor will simply delegate to `child_process`.


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

