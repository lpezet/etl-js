# ETL JS

Extract, Transform, and Load sharable and repeatable.

[![NPM Version][npm-image]][npm-url]
[![Linux Build][travis-image]][travis-url]
[![Windows Build][appveyor-image]][appveyor-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Known Vulnerabilities][vulnerabilities-image]][vulnerabilities-url]
[![CodeFactor][codefactor-image]][codefactor-url]
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flpezet%2Fetl-js.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Flpezet%2Fetl-js?ref=badge_shield)

```js
const { ETL, Local, CommandsMod } = require("@lpezet/etl-js");
var template = {
  myETLActivity: {
    commands: {
      say_hello: {
        command: "printf 'hello world!'"
      }
    }
  }
};
var myETL = new ETL(new Local());
new CommandsMod().register(myETL);

myETL.process(template);
```

Or with TypeScript:

```ts
import { ETL, Local, CommandsMod } from "@lpezet/etl-js";
const template: any = {
  myETLActivity: {
    commands: {
      say_hello: {
        command: "printf 'hello world!'"
      }
    }
  }
};
const myETL = new ETL(new Local());
new CommandsMod().register(myETL);

myETL.process(template);
```

# Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Installation](#installation)
- [Features](#features)
- [Why/when would I need this?](#whywhen-would-i-need-this)
- [Concept](#concept)
- [Security](#security)
- [Usage](#usage)
  - [Mods](#mods)
  - [Control Flow](#control-flow)
  - [Tags](#tags)
  - [Events](#events)
  - [Results](#results) - [_OBSOLETE: rework done, need doc to be updated. Advice is to NOT rely on Mod results, but use the Content with vars & env for tags._](#_obsolete-rework-done-need-doc-to-be-updated-advice-is-to-not-rely-on-mod-results-but-use-the-content-with-vars--env-for-tags_)
- [Developing Mods](#developing-mods)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Installation

This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com/).

Before installing, [download and install Node.js](https://nodejs.org/en/download/).
Node.js 10.0 or higher is required.

Installation is done using the [`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install @lpezet/etl-js
```

# Features

    * Template-based process (JSON, YAML) to express steps and activities as part of ETL
    * Extensible behavior via mods
    * Tags allowing more dynamic behavior
    * Leverage your familiar/preapproved existing tools (program binaries like mysql, mysqlimport, etc., linux binaries, etc.)

# Why/when would I need this?

**ETL-JS** is a simple **ETL glue** represented by an **ETL-JS Template**. Typically, you'd use **ETL-JS** to help with your existing ETL processes.

**ETL-JS** will **NOT** help you figure out how to dump data from MySQL. And while using **ETL-JS** to learn how to export MySQL data might help in the long run, you might get more frustrated short term and give up quickly. It would be better to figure out first how to get your data out of MySQL using whatever tool you have at your disposal (the closer to the product the better) before looking into **ETL-JS**.

The best here is to first figure out how to get those datasets and processes you need, out of your sub-systems, using those sub-system tools or other third party tools you already have (e.g. mysqlimport, pgLoader, HPCC Systems Spray/De-spray, etc.).

Once you have all that, you need to figure out how to coordinate it all.
If you can already do it all easily with the same tool(s), **ETL-JS** may not be of much help (_but read on, who knows_).
If you start scripting/coding (bash, JS, python, etc.) to stich things up then stop and take a good look at **ETL-JS**.

Here's a way to see it:

1. (_bash, curl_) Download a file from a website, an (s)ftp site or secure site
2. (_bash, unzip, grep/sed_) Do some slight processing with it (e.g. extract, rename files or even filter content of some files)
3. (_mysql_) Load that into another system
4. (_mysql_) Run some queries/process in that system
5. (_mysql_) Export the final result(s)
6. (_bash, awscli_) Potentially doing something with the results (e.g. email/share, upload to AWS S3)

In parenthesis are the tools I would use to accomplish those steps. You can easily see that it's a mix of things: standard linux binaries (curl, unzip, grep/sed), a database binary (mysql), and AWS Command Line Interface (awscli).
I could script it all in either bash or in NodeJS. I could then add it to a source repository and share this ETL process.
To make it more readable I could save the queries in different files (instead of a giant convoluted bash/JS script), make the MySQL server IP/Port more configurable (to switch between CI/QA/Prod environment), start handling foreseable errors (file missing, not compressed, no data to export, etc.), and at that point I'd have quite a lot of code and files to manage already. Also the essence of the process will get lost in all those lines of code and files.

A good and concrete example of an **ETL-JS Template** can be found here: [Precipitation & snowfall summary for specific weather stations](https://github.com/lpezet/etl-js-cli/blob/master/examples/prcp_snow_chart.yml).

# Concept

**ETL-JS** has been born from the need to script different activities as part of simple yet important extract, load, and transform processes.
The idea is to be able to share and easily repeat activities over and over as needed, and leverage existing tools.

An ETL template is basically composed of an _etlSets_ element and its activities as such:

```yml
etlSets:
  default:
    - activity1
    - activity2
activity1:
  step1:
    something: "something"
  step2:
    somethingelse: "somethingelse"
activity2:
  step1:
    some: "some"
```

Each _activity_ contains _step_ handled by [Mods](#mods). Each _mod_ typically perfom one or more tasks.
A template can just be a single activity, as shown earlier in the introduction.
Something like this will therefore suffice:

```yml
activity1:
  step1:
    something: "something"
  step2:
    somethingelse: "somethingelse"
```

# Security

Commands, scripts and more can be executed as part of the Mods defined in the template. Therefore, you should make sure to use only the Mods you trust in your ETL Template.

# Usage

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
etlSets:
  default:
    - step1
    - step2
step1:
  commands:
    orion_pic:
      command: printf "orion-nebula-xlarge_web.jpg"
      var: "picture"
step2:
  files:
    /tmp/orion-nebula.jpg:
      source: https://www.nasa.gov/sites/default/files/thumbnails/image/{{ vars.picture }}
```

This ETL template makes use of tags, which will be explained a little later.
**WARNING**: This template will effectively download a JPG file. Open it as your own risk.

Run template:

```bash
$ etl-js run hello.yaml
```

## Mods

Mods are features of the ETL template. They execute code, download files, import data into MySQL database, etc.
The idea is to leverage as much as possible of the existing and be as efficient as possible.
For more details, see the [Mods](Mods.md) page.

## Control Flow

Mods can decide whether to **skip** the remaining steps for a given activity, or even terminate (**exit**) the process.
Use cases can be:

- Mod detects that no new data has been found, decides to exit the ETL process.
- Mod detects that data didn't change and decides not to continue the current activity of doing work already done before

It's up to Mods to expose that functionality. For example, the **Commands Mod** expose the following properties:

```yml
skip_on_test_failed: true|false
exit_on_test_failed: true|false
```

## Tags

Tags can be used to make the process more dynamic. You might want your ETL process to start with a step figuring out which files to ingest (e.g. only new ones). And you would want the next step to download those files and only those files.
This means that, at the time of writing your ETL template, you do not know which files will be processed.
That's where tags come in.
You have seen those tags already in the [Getting Started](#getting-started) section. Here it is again:

```yml
etlSets:
  default:
    - step1
    - step2
step1:
  commands:
    orion_pic:
      command: printf "orion-nebula-xlarge_web.jpg"
      var: file_to_download
step2:
  files:
    /tmp/orion-nebula.jpg:
      source: https://www.nasa.gov/sites/default/files/thumbnails/image/{{ $.vars.file_to_download }}
```

The tag here is `{{ $.vars.file_to_download }}`. It basically refers to the `var` of the step1 command _orion_pic_.

The context used in tags is as follows:

```yml
vars:
	...vars go here...
env:
	...environment variables here from process.env.....
```

Here's another example using tags and making use of the `result_as_json` attribute of the `commands` mod. The `result` of the command will be parsed and stored as JSON instead of a string. This allows us to, for example, use the result as an array to download multiple files. The `files` mod will interpret that array and download multiple files.

```js
var template = {
  etlSets: {
    default: [ 'step1', 'step2' ]
  },
  step1: {
    commands: {
      "file_to_download": {
        command: "printf '[\"PIA08653/PIA08653~small.jpg\",\"PIA21073/PIA21073~small.jpg\"]'",
        result_as_json: true
        var: files_to_download
      }
    }
  },
  step2: {
    files: {
      "/tmp/{{ $.vars.file_to_download }}": {
        source: "https://images-assets.nasa.gov/image/{{ vars.files_to_download }}"
      }
    }
  }
};
```

In `step2`, the `files` mod is used to specify a dynamic file to download with tags. Each file stored in `files_to_download` variable, will be downloaded from `https://images-assets.nasa.gov/image/` and stored in `/tmp/`.

## Events

ETL will emit some events during the ETL process.

- _activityDone( activityId, error, data, activityIndex, totalActivities )_ - An activity has been completed (with or without error). The **activityId** is the name of the activity as specified in the template, the **activityIndex** is the order number the activity has been executed and the **totalActivities** represent the total number of activities to be run.

## Results

##### _OBSOLETE: rework done, need doc to be updated. Advice is to NOT rely on Mod results, but use the Content with vars & env for tags._

The ETL `process()` method returns a Promise. Upon success, the data **resolved** will contain the results of the process and each activity.

Reusing the advanced template from the [Tags](#tags) section:

```js
var template = {
  etlSets: {
    default: [ 'step1', 'step2' ]
  },
  step1: {
    commands: {
      "file_to_download": {
        command: "printf '[\"PIA08653/PIA08653~small.jpg\",\"PIA21073/PIA21073~small.jpg\"]'",
        result_as_json: true
        var: files_to_download
      }
    }
  },
  step2: {
    files: {
      "/tmp/{{ vars.file_to_download }}": {
        source: "https://images-assets.nasa.gov/image/{{ vars.file_to_download }}"
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

# Developing Mods

A separate documention is provided to develop new mods. It can be found [here](ModsDev.md).

# License

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
[codefactor-image]: https://www.codefactor.io/repository/github/lpezet/etl-js/badge
[codefactor-url]: https://www.codefactor.io/repository/github/lpezet/etl-js

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flpezet%2Fetl-js.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flpezet%2Fetl-js?ref=badge_large)
