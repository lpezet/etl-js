# ETL JS

Extract, Transform, and Load sharable and repeatable.

[![NPM Version][npm-image]][npm-url]
[![Linux Build][travis-image]][travis-url]
[![Windows Build][appveyor-image]][appveyor-url]
[![Test Coverage][coveralls-image]][coveralls-url]

```js
const ETLJS = require('@lpezet/etl-js');
const Executor = require('@lpezet/etl-js/lib/executors').local;
const Commands = require('@lpezet/etl-js/lib/commands');

var template = {
	etl: [ step1 ],
	step1: {
		commands: {
			say_hello: {
				command: printf 'hello world!'
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

WARNING: This template will effectively download a JPG file. Open it as your own risk.

  Run template:

```bash
$ etl-js hello.yaml
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

