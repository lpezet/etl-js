# ETL JS

Extract, Transform, and Load sharable and repeatable.

[![NPM Version][npm-image]][npm-url]
[![Linux Build][travis-image]][travis-url]
[![Windows Build][appveyor-image]][appveyor-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Known Vulnerabilities][vulnerabilities-image]][vulnerabilities-url]


```js
const ETLJS = require('@lpezet/etl-js');
const Executor = require('@lpezet/etl-js/lib/executors').local;
const Commands = require('@lpezet/etl-js/lib/commands');

var template = {
	etl: [ 'step1' ],
	step1: {
		commands: {
			say_hello: {
				command: "printf 'hello world!'"
			}
		}
	}
};

var ETL = new ETLJS( new Executor() );
new Commands( ETL );

ETL.process( template );
```

# Installation

This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/).

Before installing, [download and install Node.js](https://nodejs.org/en/download/).
Node.js 0.10 or higher is required.

Installation is done using the [`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install @lpezet/etl-js
```

# Features

	* Template-based process (JSON, YAML) to express steps and activities as part of ETL
	* Extensible behavior via mods
	* Tags allowing more dynamic behavior through activities and mods.
	
# Concept

ETL-JS has been born from the need to script different activities as part of simple yet important extract, load, and transform processes.
The idea is to be able to share and easily repeat activities over and over as needed.

# Security

Commands, scripts and more can be executed as part of the Mods defined in the template. Therefore, you should make sure to use only the Mods you trust in your ETL Template.


# Getting Started

The quickest way to get started is to use ETL-JS via command line, with [`ETL-JS CLI`](https://github.com/lpezet/etl-js-cli).

  Install the executable:

```bash
$ npm install -g @lpezet/etl-js-cli
```

  Initialize process:
  
```bash
$ etl-js init
```

  Edit `settings.yml`, to specify the type of executor to use:
  
```yml
etl:
  executor: local1
  
executors:
  local1:
    type: local
```

  Create ETL template, hello.yml:

```yml
etl:
  - step1
  - step2
step1:
  commands:
    orion_pic:
      command: printf "orion-nebula-xlarge_web.jpg"
step2:
  files:
    /tmp/orion-nebula.jpg:
      source: https://www.nasa.gov/sites/default/files/thumbnails/image/{{ $.step1.commands.orion_pic.result }}
```

This ETL template makes use of tags, which will be explained a little later.
WARNING: This template will effectively download a JPG file. Open it as your own risk.

  Run template:

```bash
$ etl-js run hello.yaml
```

## Mods

Mods are features of the ETL template. They execute code, download files, import data into MySQL database, etc.
The idea is to leverage as much as possible of the existing and be as efficient as possible.
For more details, see the [Mods](Mods.md) page.

## Tags

Tags can be used to make the process more dynamic. You might want your ETL process to start with a step figuring out which files to ingest (e.g. only new ones). And you would want the next step to download those files and only those files.
This means that, at the time of writing your ETL template, you do not know which files will be processed.
That's where tags come in.
You have seen those tags already in the [Getting Started](#getting-started) section. Here it is again:

```yml
etl:
  - step1
  - step2
step1:
  commands:
    orion_pic:
      command: printf "orion-nebula-xlarge_web.jpg"
step2:
  files:
    /tmp/orion-nebula.jpg:
      source: https://www.nasa.gov/sites/default/files/thumbnails/image/{{ $.step1.commands.orion_pic.result }}
```

The tag here is `{{ $.step1.commands.orion_pic.result }}`. It basically refers to the `result` of the step1 command *orion_pic*.
You can see the full JSON of the result of each activity and mod in the [Results](#results) section to help figure out attributes available to use in tags.

Here's another example using tags and making use of the `result_as_json` attribute of the `commands` mod. The `result` of the command will be parsed and stored as JSON instead of a string. This allows us to, for example, use the result as an array to download multiple files. The `files` mod will interpret that array and download multiple files.

```js
var template = {
  etl: [ 'step1', 'step2' ],
  step1: {
    commands: {
      "file_to_download": {
        command: "printf '[\"PIA08653/PIA08653~small.jpg\",\"PIA21073/PIA21073~small.jpg\"]'",
        result_as_json: true
      }
    }
  },
  step2: {
    files: {
      "/tmp/{{ $.step1.commands.file_to_download.result }}": {
        source: "https://images-assets.nasa.gov/image/{{ $.step1.commands.file_to_download.result }}"
      }
    }
  }
};
```

In `step2`, the `files` mod is used to specify a dynamic file to download with tags. Each `file_to_download` result, will be downloaded from `https://images-assets.nasa.gov/image/` and stored in `/tmp/`.

## Events

ETL will emit some events during the ETL process.

- *activityDone( activityId, error, data, activityIndex, totalActivities )* - An activity has been completed (with or without error). The **activityId** is the name of the activity as specified in the template, the **activityIndex** is the order number the activity has been executed and the **totalActivities** represent the total number of activities to be run.


## Results

The ETL `process()` method returns a Promise. Upon success, the data **resolved** will contain the results of the process and each activity.

Reusing the advanced template from the [Tags](#tags) section:

```js
var template = {
  etl: [ 'step1', 'step2' ],
  step1: {
    commands: {
      "file_to_download": {
        command: "printf '[\"PIA08653/PIA08653~small.jpg\",\"PIA21073/PIA21073~small.jpg\"]'",
        result_as_json: true
      }
    }
  },
  step2: {
    files: {
      "/tmp/{{ $.step1.commands.file_to_download.result }}": {
        source: "https://images-assets.nasa.gov/image/{{ $.step1.commands.file_to_download.result }}"
      }
    }
  }
};
ETL.process( template ).then(function( pResults ) {
  console.log( util.inspect(pResults, false, null, true) );
});
```
, the result would be (some omission for brevity):

```js
{ etl: { exit: false },
  step1:
   { commands:
      { file_to_download:
         { error: null,
           result:
            [ 'PIA08653/PIA08653~small.jpg', 'PIA21073/PIA21073~small.jpg' ],
           message: null,
           exit: false,
           pass: true,
           _stdout:
            '["PIA08653/PIA08653~small.jpg","PIA21073/PIA21073~small.jpg"]',
           _stderr: '' } } },
  step2:
   { files:
      { '/tmp/PIA08653/PIA08653~small.jpg':
         { error: null,
           result:
            "--2019-03-03 11:28:23--  https://images-assets.nasa.gov/image/PIA08653/PIA08653~small.jpg\nResolving images-assets.nasa.gov... 52.84.216.98, 52.84.216.44, 52.84.216.36, ...\nConnecting to images-assets.nasa.gov|52.84.216.98|:443... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 21833 (21K) [image/jpeg]\nSaving to: '/tmp/PIA08653/PIA08653~small.jpg'\n\n     0K .......... .......... .                               100% 3.48M=0.006s\n\n2019-03-03 11:28:24 (3.48 MB/s) - '/tmp/PIA08653/PIA08653~small.jpg' saved [21833/21833]\n\n",
           message: null,
           exit: false,
           pass: true,
           _stdout:
            "--2019-03-03 11:28:23--  https://images-assets.nasa.gov/image/PIA08653/PIA08653~small.jpg\nResolving images-assets.nasa.gov... 52.84.216.98, 52.84.216.44, 52.84.216.36, ...\nConnecting to images-assets.nasa.gov|52.84.216.98|:443... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 21833 (21K) [image/jpeg]\nSaving to: '/tmp/PIA08653/PIA08653~small.jpg'\n\n     0K .......... .......... .                               100% 3.48M=0.006s\n\n2019-03-03 11:28:24 (3.48 MB/s) - '/tmp/PIA08653/PIA08653~small.jpg' saved [21833/21833]\n\n",
           _stderr: '' },
        '/tmp/PIA21073/PIA21073~small.jpg':
         { error: null,
           result:
            "(...)",
           message: null,
           exit: false,
           pass: true,
           _stdout:
            "(...)",
           _stderr: '' } } } }
```


## License

  [MIT](LICENSE)

[npm-image]: https://badge.fury.io/js/%40lpezet%2Fetl-js.svg
[npm-url]: https://npmjs.com/package/@lpezet/etl-js
[travis-image]: https://travis-ci.org/lpezet/etl-js.svg?branch=master
[travis-url]: https://travis-ci.org/lpezet/etl-js
[coveralls-image]: https://coveralls.io/repos/github/lpezet/etl-js/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/lpezet/etl-js?branch=master
[appveyor-image]: https://ci.appveyor.com/api/projects/status/lr513vvn3is4u7nd?svg=true
[appveyor-url]: https://ci.appveyor.com/project/lpezet/etl-js
[vulnerabilities-image]: https://snyk.io/test/github/lpezet/etl-js/badge.svg
[vulnerabilities-url]: https://snyk.io/test/github/lpezet/etl-js
