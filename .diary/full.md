[//]: # (DO NOT EDIT THE FOLLOWING. This content is automatically generated from diary entries.)

## (03/08/2019) Rethink tags/context

Maybe the context itself is just:

```yaml
local:
# ....current activity stuff....
global:
  # ...previous activities stuff...
env:
  # ...env stuff...
params:
  # ...params stuff...
```

OR

find a way to keep adding to the global context....

```bash
env YEAR=2018 etl-js run my.yml
```

Right now we have:

```yaml
etl:
  exit: false
  step1:
    # ...
  # ...
```

Proposal:

```json
{
  "env": {
    "YEAR": 2018
  },
  "etl": {
    "exit": false
  },
  "custom1": {},
  "custom2": {}
}
```

## (05/09/2019) New Architecture

### Context, variables, and activity/step results (DONE 06/16/2019)

Variables should be stores in Context in handle() method (last argument), in the "vars" property.
For example:

```yml
commands:
  mycmd:
    command: printf 2019
    var: select_year
```

After executing the command above, `Context` would contain:

```json
{
  "env": {},
  "vars": {
    "select_year": "2019"
  }
}
```

This changes a couple of things. The most important one is that, results from "steps" should now just be in an array and not a map.
Reason is, with the array, we can execute the same step as many times as we want.
For example:

```yml
- step1:
    stdout: "A"
- step1:
    stdout: "B"
```

TemplateContext used during evaluation of tags in mods can still use either the global results of steps or the { env: {}, vars: {} } context or combination of both.
Having said that, I'm not sure we need both a _pCurrentActivityResult_, _pGlobalResult_ anymore.

### Process flow (DONE 06/23/2019)

The last piece is control over process flow. Maybe a command or test should stop the process.
Right now it's done with the awkward "exit: true" in the promise result.

I think each Mod should resolve with an ProcessFlow-type object.
Maybe it just resolves "exit: true" if process needs to stop. That's a good start. Later on we could improve the control over the flow.

In particular, the `commands` mod should have:

```
ignoreErrors: true|false
exitOnError: true|false
skipStepOnError: true|false
```

For this to work, there has to be a contract between Mods and ETL.
Meaning ETL has to understand parts of the results from a given Mod, at least the control flow part.
For example, maybe a Mod should resolve (or reject) using parameter like so:

```
{ results: [], exit: true|false, error: ... }
```

(23/05/2019) Was thinking maybe a process needs to skip an activity but not the rest. For example, data hasn't change so no need to create same data profiling again, but we may still want to create a week-to-week report for example (to show data hasn't changed).

How about:

```
{ results: [], exit: true|false, skip: true|false, error: ... }
```

## (11/25/2019) Plugin Architecture, Clean end

### Plugin Architecture

See example of plugin architecture here:
https://github.com/release-it/release-it/blob/v11/docs/plugins/README.md
https://github.com/release-it/release-it/blob/0b5cb1a6298cc470c984e387bec845c4b46596f6/lib/plugin/factory.js

Basically:

```json
{
  "devDependencies": {
    "release-it": "*",
    "release-it-bar": "*"
  },
  "release-it": {
    "github": {
      "release": true
    },
    "plugins": {
      "release-it-bar": {
        "key": "value"
      }
    }
  }
}
```

We could do something like:

```json
{
	"dependencies": }
		"etl-js": "*",
		"my-etl-js-plugin": "*"
	}
}
```

And then in the ETL template:

```yaml
mods:
  - my-etl-js-plugin
etl:
  - step1
step1:
  my-etl-js-plugin:
    # ...
  # ...
```

It's a bit awkward to mix custom stuff and "reserved" stuff. For example, we need to make sure mods name do not conflict with "etl", "etlSet", and "mods" (if we use it). Maybe look for a different structure?

Idea one: turn "etl" into the container for steps for etl. Like so:

```yaml
mods:
  - lpezet@something
  - commands
  - file
etlSets:
  mySet1:
    - step1
etl:
  step1:
    lpezet@something:
      # ...
    step2:
      # ...
```

Note on plugins/mods: maybe enforce namespace in modules. Those without are built-in (e.g. commands, files, etc.). Custom ones must be with namespace (e.g. lpezet@my-etl-js-plugin) or an error (or WARNING?) is thrown.

Note: we could avoid the "mods" block and simply load on the fly the module if not built-in:

    1. if key not in built-in-command-names,
    2. load = ( key ) => try { require( key ); } catch (e) { .... }
    3. load( key )
    3. else use built-in-commands[ key ]

Look into this too:
https://github.com/release-it/release-it/blob/9be76397d8b1aa17e5b606db871ed75538990a20/lib/tasks.js

Might want to use it with say hpcc-cluster to add etl-js as a plugin.

### Clean end

I like how clean it ends:
https://github.com/release-it/release-it/blob/v11/bin/release-it.js

```js
release(options).then(
  () => process.exit(0),
  () => process.exit(1)
);
```

## (11/26/2019) ETL Testing

### How to "unit test" ETL?

What do we need to test?

- code is right: syntax vs. ETL-JS and mods
- code within mod: For example: can we compile ECL code for hpcc-ecl mod?
- how about moving files around? (downloading, testing existance, etc.)

There are 3 kind of results:

1. actual (expected) right result. E.g.: got "something":0, as expected.
2. acutal wrong result. E.g.: got "something": 1 but expected 0
3. (unexpected) error. E.g.: something threw an exception, somewhere.

Going through ETL template, we can collect all mods and associate "mock" executors (??? what if mod doesn't need executor? like fetching url).

Then create test plan, where each executor can either be RESULT, UNEXPECTED_RESULT, UNEXPECTED_ERROR.
In a way, like genetic algo, except that instead of being binary, might just have more states.

`MUST`: for each test plan, must be able to explain what happened: what was the test about, and what broke exactly (in plain English).

For each mod, there could be a specific "Tester". For example, for "file", the "Tester" will take care of urls and such.
For mods without their specific "Tester", just do generic testing: `mock executor`.

### Can we call an ETL template inside an ETL template?

This could be interesting. The idea is that, sometimes we have ETL templates based on existing infrastructure (e.g. a database, tables, files, web services, etc.).
The ETL Template Unit Test could setup that infrastructure for the ETL template to be tested.

## (06/02/2020) Platform Abstraction

### Problems

#### writeFile()

Problems are:

- path may not work across platforms. Client need to handle this
- temp files are difficult to manage that way
- outputs of certain commands rely on paths too. See example below.

```json
"root": {
  "summary_{{ year }}": {
    "cluster": "thor",
    "content": "OUTPUT({{ year }});",
    "output": "/tmp/{{ year }}/test.csv"
  }
}
```

Solutions:

- `TODO` Handle path translation automatically. Assumption is to use POSIX style by default, although we could try to detect the type of path and translate accordingly.

- `TODO` Commands should rely on Executors utility methods (to be provided) in order to resolve "paths". So for instance, the "output" in the example above, should be handled by the command using Executor's function to resolve that path, depending on the platform.

#### download files

Problems are:

- Some widely used commands are not cross-platform compatible. For example: wget, curl.

Solutions:

- Provide new method `download()` to help with that.

#### custom (cross-platform) methods

Problem: Trying to help with cross-platform support we _want_ to add methods in Executor interface. This would make things no longer backward compatible.

Solution: Provide a Base implementation so if used, default implementations will be provided so Clients don't have to update code.

## (06/05/2020) Improvements, Resumable Process

### Improvements

Separate `process properties` vs. `command properties`.
For example, command might ask process to save variables (and consequently re-load them).
For example:

```yml
root:
  commands:
    001_toto:
      command: echo "toto"
      cwd: /home
      test: [! -F /tmp/toto]
      _resumable: true
      _save_state: true
```

#### Resumable process

It might be more on `etl-js-cli` side, but the idea is to provide a more "async" ETL process.
For example, ETL process is triggered automatically every hour or so. Part of the process is to have user login to update some protected resources (e.g. Google Sheet).
The process would be:

- Run couple steps
- Request user to sign in (because either don't have any tokens or token expired)
- User signs in
- Process is resumed once sign in detected (most likely IdP redirected to page that would help resume the process)

In this situation, ETL JS might need an online Service as the "middleman".
ETL JS would contact the Service to "drop" a token (along with oauth2 state maybe), to be used as callback once user has logged in.
Service sends notification to user that an action is required (here a login).
Once user logged in, either callback is called by Service or ETL JS requests update/status.
ETJ JS would poll for updates from Service and retrieve token, necessary to continue with the process.

Problems:

- Need a separate web Service (could be a Lambda function though).
- ETL JS needs to poll Service regularly
- ETL JS process must be resumable: this means, whatever variables were used before, it should be able to load (and saved it prior) variables.

How???
We would need to save the activity name, but also which step we were at, AND let the step handle its own resume.
For example:

```yaml
activity1:
  commands:
    001_hello: ...
    002_world: ...
  files: ...
```

Say we want `002_world` to be resumable.
Process would save `activity1`, and `commands`, but then the CommandsMod would need to save `002_world` somehow.
The ETL process would call CommandsMod.resume(....) instead of the usual Mod.handle(...) (or some extra parameters).

That mean ETL must store its own state as well.
Draft of state:

```yml
etlSet: "abc" # even if it was an activity?
step: "commands"
retries: 0 # ????
context: {
  vars: ...
  env: ...
}
```

We can add a new optional parameter `resume` to Mod's `handle()` method:

```js
export default interface Mod {
  register(pETL: IETL): void;
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context,
    pResume?: boolean
  ): Promise<any>;
}
```

But still: how does a Mod save the exact step it was last processing????

ETL Template to use for testing resumable process:

```yml
etlSets:
  default:
    - a1
    - a2

a1:
  test:
    dontmatter: 1
  breaker:
    times: 2
a2:
  test:
    dontmatter: 1
```

The TestMod (etl/test.ts) will count calls made to the mod.
The BreakerMod (`TODO`) will "break" (exit) until counter reaches "times" value. In the example above it will "break" 2 times, before process proceeds to next activity.
The test then is:

```js
oTested
  .process(oETL)
  .then(() => {
    assert.equal(oTestMod.calls(), 1);
    return oTested.process(oETL); // re-running it...might need some extra bits of info to understand to "resume" from before
  })
  .then(() => {
    assert.equal(oTestMod.calls(), 1);
    return oTested.process(oETL);
  })
  .then(() => {
    assert.equal(oTestMod.calls(), 2);
  });
```

## (08/25/2020) Google APIs (New Mod)

Use API Key instead of OAuth2/OpenID for now. Resumable process is still a (big) work in progress.
Make "google-apis" mod work with API Key first, then look into OAuth2.

Actually, it looks like for Google Sheets API, API Key credentials are not possible. It MUST be through OAuth2 Keys only...

### Google Sign In.

Check cue-me-in (although I believe it uses ReactJS stuff...) and this:
https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow

The idea would be to have an interactive ETL process, where user would login for the ETL process to update stuff on behalf of user (in user's Google account...like say create or update a spreadsheet).

```yml
root:
  google-apis: ...something...
```

The GoogleAPIsMod would initiate login process if token not present already.
Idea: could create a variable and ask ETL process to save state before exiting.
`TODO`: storing application settings is more for `etl-js-cli`, but `etl-js` should be able to store its `state`...somehow...

## (01/14/2021) Executor & Frictionless

### Executor

Maybe each Mod allow user to specify different Executor?
For example, some Commands could be executed remotely, some locally.

## Frictionless (New Mod?)

Mod to handle data with Metadata.
Look further down for "Thoth Metadata".

We can use Frictionless datapackages (e.g. https://github.com/frictionlessdata/examples/blob/master/inflation/), and create a Mod to handle datapackage.json.
For example:

```yml
root:
  frictionless:
    inflation_data:
      source: https://github.com/frictionlessdata/examples/blob/master/inflation/
      resource: inflation-gdp
      action: download
      target: /tmp/somefile.csv
  hpcc-sprays:
    "hello::inflation":
      source: /tmp/somefile.csv
      ...
```

Now it would be great if `frictionless` Mod would handle the configuration for other Mods, like `hpcc-sprays` and such.
For example:

```yml
root:
  frictionless:
    inflation_data:
      source: https://github.com/frictionlessdata/examples/blob/master/inflation/
      resource: inflation-gdp
      actions:
       - download: /tmp/somefolder/or/file.txt
       - load:
           hpcc-sprays:
             key: "helo::toto::titi"
             someother_hpcc_sprays_specific_config: something
           ...
       - transform:
           hpcc-ecls:
             key: "helo::toto::titi"
```

For the `load`, Frictionless Mod would provide the configuration for `hpcc-sprays`.
Would that work with current implementation of ETL-JS?
Can a Mod call another Mod????

What would be best maybe is to just have a Frictionless HPCC Mod instead. It would simplify development.
Might look like this:

```yml
root:
  hpcc-frictionless:
    inflation_data:
      source: https://github.com/frictionlessdata/examples/blob/master/inflation/
      logicalFilenamePrefix: "frictionless::examples::inflation"
      targetDir: /var/lib/HPCCSystems/mydropzone/frictionless
      resources:
        - inflation-gdp
        - inflation-consumer-gdp
```

This `hpcc-frictionless` Mod would 1) download the data files (some conventions or use targetDir value for where to put those files), 2) load the files into HPCC with the convention `logicalFilenamePrefix::resource_name::raw`, and 3) create new logical file `logicalFilenamePrefix::resource_name::pressed` (like olive oil) with the schema from datapackage.json.

## (02/18/2021) New architecture

Working on re-coding ETL.
Work started in "rearch" (re-architecture) folder(s) (including in tests/).

Tests for etl.ts pass except:

- skip
- exit
- events (commented those out in new activity.ts)
- modThrowingError (no idea, haven't looked at it)
- subActivities (those tests have actually been commented out)

For `skip` and `exit`, we need to revisit the control flow.

Here's an example of what we may want to do:

```yml
activity1:
  step1:
    # CONTINUE
    # Continue to the next step, if any.
    # This is most likely the most common usecase.
  step2:
    # STOP
    # Do not go to next step and terminate this activity.
    # This is most likley a very common usecase. For example, check at the beginning on an activity if something has been done already.
    # If so, skip the rest of the steps.
    #
    # Another usecase is when a step is waiting for feedback/input from user or another separate process.
    # State could be shared and stored by process and re-loaded before next run. It's up to ETL to skip steps that were done before and re-run the step where we stopped at before.
    # HOWEVER, STOP does not necessarily mean that the process wants to resume at that step/activity next run.
    # Maybe in this case then it's more like a PAUSE than a STOP?
  step3:
    # EXIT.
    # This might happen if Mod wants to make sure the process is really stopped.
    # Most likely due to an error. This does not only terminate this activity, but also all subsequent activities.
  step4:
    # JUMP
    # Go to another step (e.g. step 5, or even step 1!).
    # WARNING: I'm not sure about that one. This is a very advanced and most likely rare usecase
    # The problem with the implementation of that step is that it requires more than just one attribute/result (next step AND which step(s)).
    # It's possible the JUMP in most likely to another activity and not a step (step is like "files", "commands", etc. not very meaningful in itself).
    # In this case then, it's more like BRANCHING then. Dynamic routes so to speak...
  step5:
    # REPEAT
    # Repeat this step. I think this might be a rare usecase as well...should be easy to implement though.
    # Properties at the Activity level might control the maximum number of retries. Or even provide supervision (Supervisor pattern).
  step6:
    # ...
```

Another thought is `dynamic flow`. We can do sub-activities, which in essance changes the flow but require the Mod to (re)create those new activities/steps.
The `dynamic flow` is more about using the already defined steps/activities and only referring to those.
For example, in a given run, a Mod might decide to run `activity2,activity4`, then in another run just `activity5`. This seems close to the JUMP idea from the YAML above.

One idea for flows, and more generally on how to handle activities, is to use a STACK.
After resolving the `etlSet` we need to go through, we would add them, in proper order, to the STACK.
In essense, we would have the followins in ETL:

- `STACK`: could also be called `FLOW` here. Basically, we populate the stack initially with all the activity `keys`, then pop an activity (its key, then get the template for the activity), execute it, and then pop another etc. until stack is empty (or error thrown).
- `Activities`: This is basically what we have today: the template which specify the steps and other properties for each activity.

The idea here is that, an `activity` could push another activity (either in front, or in the back) to the `stack` to be run accordingly.
A usecase might be that, if a step/activity detects that something is missing, the activity might request to run that activity to install say prerequisites.
A more advanced usecase might have an activity PAUSE itself, run the new activity to setup prerequisites for example, then RESUME itself...

Now at this stage, HOW activities/steps CAN CONTROL THE FLOW?
For example, how can I run a `command` and, based on output (could use var), change the flow if need be?
Maybe a `FlowMod`???? (bad idea mate)

```yml
activity1:
  commands:
    001_check_install:
      command: "rpm -qa something && echo Yes || echo No"
      var: installed
  flows:
    ????:
      expression: "$vars.installed == 'Yes'"
      true:
        addFirst: "activity9" # here we would push to the STACK "activity9"
        #addLast: "someactivity" # just another example
      # implicitly false does nothing here
```

Here the FlowsMod needs a boolean expression, and specifications for TRUE and/or FALSE (nothing to do nothing).
PROBLEM: because of those unique keys within each activity, we can't have more than 1 _flows_ here.
HOW TO SOLVE THAT?
`IDEA #1`: We could have Mod handle entries where their key is the prefix. For example, CommandsMod could handle commands1, commands2, commands_3.
Problem is what happens when mods have composite words? Like image-magic...could the ImageMod handle image-magic over the ImageMagicMod????
`IDEA #2`: we could then introduce STEP, like we have ACTIVITY.
For example:

```yml
activity1:
  step1:
    commands:
      command: something
    files:
      "/tmp/toto": ...
  step2:
    flows: ...
  step3:
    commands: ...
```

The problem here is that it makes it very verbose and in some cases ridiculous, especially if we either:

- have only 1 Mod per step (e.g. step1 is commands, step2 is files, step 3 is something else, etc.)
- put everything under one step (step1)

`IDEA #3`: Could we have a special keyword to wrap things up a bit?
For example:

```yml
activity1:
  commands: ....
  wrap1:
    files: ....
    commands: ...
  files: ....
```

Here `wrap` could embed anything and here we end up having 2 sets of commands and 2 sets of files under the same activity.

## (02/21/2021) Following on 2/18/2021

I forgot that the new `Activity` structure is as such:

```yml
activity1:
  executor?: string
  max-retries: 10
  ...
  steps:
    ...
```

It doesn't solve (yet) the problem of duplicate `Mods` withint `steps`, but it's just a reminder.
We could try to support both legacy and `advanced` structure like so:

```yml
activityLegacy:
  commands:
    ...
activityNew:
  executor: ...
  ...
  steps:
    commands:
      ...
activityNewAdvanced:
  executor: ...
  ...
  steps:
    step1:
      commands:
        ...
```

Rule 1: **If _activity_ has an element _steps_, proceed using the new structure. Otherwise, use _legacy_ (with _executor_ feature still).**

Rule 2: **Within _steps_, check if contains any element with "step[0-9]+". At the first element matching this pattern, proceed with _advanced_ feature. Otherwise, create new _step0_ element and resolve the rest under that new element (therefore following the _advanced_ feature).**

Started coding that new structure and rules.
I'm back at handling how to deal with ERRORs and the FLOW (working on modThrowingError test).
Right now I'm catching the error in Activity.ts and returning `Promise.resolve()` (so to speak) with a status=IN_ERROR.
I'm translating that ActivityStatus into a (new) ETLStatus. I do think there's a good reason to separate ActivityResult and ETLResult (e.g. ETL process is DONE, whether in error or not), but I can see how ActivityResult could also just be ETLStatus.
Couple things right now I need to figure out:

- There's a difference in all levels of error: 1) error from the Mod's handle() method (e.g. a syntax error or null references, etc.), 2) a process error (e.g. CommandsMod's command exited with error code 1), 3) error in activity.ts (not handling some special case for example), 4) error in etl.ts (same here), 5) any unexpected error (big try/catch in etl and activity process\* method for example).
- The _status_ really need some work. Gotta figure out the actual state vs. the information provided with the state. For example, something can be DONE, but could have an ERROR as well. So the STATE = DONE, but an ERROR could be provided. We could also split the DONE state into DONE (without ERROR)), and DONE_WITH_ERROR or IN_ERROR. And then we gotta figure out thos different level of ERRORs.

Ideas:

1. Errors thrown from ETL (etl.ts) inside the etl.ts script, should be thrown as well to clients. This skips the `Promise.reject()`. This should definitely stop the process.
2. Errors thrown within an `Activity` should be caught by etl.ts and relayed as `Promise.reject()`. This should stop the process.
3. Errors from `Promise.reject()` within an `Activity` should be caught by etl.ts and relayed in ETLResult. This should stop the process, unless specified othewise.
4. Errors thrown within a `step` should be caught by `Activity` and relayed in ActivityResult. This should stop the overall process (unless specified otherwise)
5. Errors from Promise.reject() within a `step` should be caught by `Activity` and relayed in ActivityResult.

## (05/30/2021) Skip & Repeat

Add `SKIP` in `ModStatus` and `REPEAT1` and `REPEATALL` as well.

- **SKIP**: skip the rest of the steps in the current activity (e.g. file already downloaded or processed and un-changed)
- **REPEAT1**: repeat current step (module)
- **REPEATALL**: repeat current activity

## (07/18/2021)

### New Control Flow Approach(es) (better mate)

Thinking about adding to existing `Mod` interface hooks like "onError", "onSuccess".

```yml
etlSets:
  default:
    - activity1
    - activity2
activity1:
  step1:
    something: "something"
    onError: continue|stop|exit|goto
    onSuccess: continue|stop|exit|goto
  step2:
    somethingelse: "somethingelse"
activity2:
  step1:
    some: "some"
```

Another approach is to define all those activities as standalone elements, and literally "graph it out" using more definitions.

For example:

```yml
etlSets:
  default:
    init: activity1
    # edge definition style
    edges:
      - from: activity1
        to: actitity2
        condition: success
      - from: activity1
        to: actitity3
        condition: error
      - from: activity1
        to: actitity4
        condition: [$mvar === "toto"]

    # Above is too verbose and hard to read. How about this instead?
    nodes:
      - ref: activity
        when:
          - condition: status === "error"
            next: activity3
          # would that even work in yaml????
          - condition: status === "success" && ($myvar === "toto")
            next: activity4
          - condition: true # or maybe even skip condition:
            next: activity1 # default case
    # Generic onError to be used if not specified for a given activity
    onError: continue|stop|exit|goto
activity1:
  step1:
    something: "something"
    onError: continue|stop|exit
    onSuccess: continue|stop|exit
  step2:
    somethingelse: "somethingelse"
activity2:
  step1:
    some: "some"
```

## (11/10/2021) Fixing/Improving mysqls mod

Need to work on implementation of `mysqls` mod.

### Password (security)

User's password should be stored in ~/.my.cnf like so:

```
[client]
password=my_password
```

And protect it using `chmod 600 ~/.my.cnf`.

Or another way is to store it in any file and pass that as argument to mysql client, like so:

```bash
mysql --defaults-file=/somewhere/my_mysql.conf
```

For more details, see:
https://dev.mysql.com/doc/refman/8.0/en/password-security-user.html

### Behavior

Right now the behavior is to create a file based on the key provided in the template.
For example:

```yaml
step1:
  mysqls:
    here_is_something:
      db_name: test
      execute: CREATE table test(id INTEGER);
```

Here, the current implementation will try to create the file `here_is_something`.
The intent here is not to output results in a file, but just to execute SQL code.
Need to change implementation to allow for both.

Ideas:

- Scheme

```yaml
step1:
  mysqls:
    "file:here_is_something":
      db_name: test
      execute: CREATE table test(id INTEGER);
```

- Option

```yaml
step1:
  mysqls:
    here_is_something:
      db_name: test
      execute: CREATE table test(id INTEGER);
      output: /tmp/myfile.csv
```

The "Option" way is the way to go.

