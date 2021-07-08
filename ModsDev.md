# Mods Development

Each Mod provide some functionality useful to an ETL process. For examples, the Commands Mod will provide the ability to run commands on either the host or the client, to unzip files, run scripts, etc. The Files Mod is useful to download files from ftp servers, over http/https, etc.
This documentation explains in details the structure and behavior expected out of a Mod, to help develop new mods or extend existing ones.

# Table of contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Architecture (re-arch)](#architecture-re-arch)
  - [Registration](#registration)
  - [Handling](#handling)
    - [Control Flow](#control-flow)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Architecture (re-arch)

The interface for any `Mod` is defined as follows:

```typescript
export default interface Mod<T> {
  isDisabled(): boolean;
  register(pETL: IETL): void;
  handle(pParams: ModParameters): Promise<ModResult<T>>;
}
```

## Registration

For a `Mod` to be part of an `ETL` process, it must be able to register itself against the `IETL` interface:

```typescript
export interface IETL {
  mod(pKey: string, pSource: Mod<any>, pCallback?: ModCallback): void;
  processTemplate(pTemplate: any, pParameters?: any): Promise<ETLResult>;
  getExecutor(pKey?: string): Executor | null; // if no key provided, return default executor, if any
  getMod(pKey: string): Mod<any> | null;
  emit(event: string | symbol, ...args: any[]): boolean;
}
```

Typically, a (main) routine will call `myMod.register(myETL)` to let the module register with the IETL instance. A module is expected to call the `mod()` function (at least once) to register itself with the IETL instance by passing the following information:

- **pKey**: the key used in a template. The module will then _process_ those keys when showing up during the parsing of the template.
- **pSource**: the instance of the module itself (or another instance if need be). It's up to the module to pass that instance so the ETL process will call the `handle()` method on it when processing `pKey` elements.
- **pCallback**: a callback method the module can pass to the `mod()` function. The ETL object will call this method and pass any settings made available to it for that module.

As mentioned, a module could actually call the `mod()` method multiple times in order to process more than `1 element for example.

At run time, the `IETL` instance will also check whether the module is disabled or not, using the `isDisabled()` method. If the module is said to be disabled, it will skip it and move on.

In the end, the goal of the registration is to let the `IETL` instance what element this module is supposed to process.

## Handling

When a template is being processed by the `IETL` instance, and after figuring out which module to use to process a given element, it will call the `handle(pParams: ModParameters): Promise<ModResult<T>>` method against it.
The module is then in charge of processing the element and all its children.
The `IETL` instance will wait for the module to be done before moving on to the next element/module (unless told otherwise, see ModStatus below).

The following information is made available in the `pParams` of the `handle()` method:

- **parent**: the key of the parent of the element about to be processed by the module.
- **config**: the element (and its children) the module needs to process.
- **executor**: the executor to be used for this process. Note that the module can actually use a different executor(s) if need be.
- **context**: the current context of this process. Some information can be exchanged between modules or made available from the start (e.g. environment variables) through this `context`.

### Control Flow

A module is in charge of processing certain elements. The result of such process might affect the flow of the overall process: either continue, skip the current activity, or even terminate the current process.
A module must return a `Promise` with the result of type `ModResult<T>` as defined as:

```typescript
export interface ModResult<T> {
  status: ModStatus;
  state?: T;
  error?: ModError;
  [key: string]: any;
}
```

This interface provides some features that the module you are developing can influence the behavior of the `IETL` instance managing the overall process.

The `ModStatus` is defined as:

```typescript
export enum ModStatus {
  CONTINUE,
  STOP,
  REPEAT,
  EXIT
}
```

The `IETL` instance will respect the `status` returned by a module's handling of its data as follows:

- **CONTINUE**: the process will continue to the next element/module. This is the default behavior.
- **STOP**: the process will stop at this point. It is assumed that this is an _expected_ stop, where the process needs to stop in order to continue later on (e.g. waiting for human approval).
- **EXIT**: this process will stop at this point, but it is assumed that something wrong happened.
- **REPEAT**: (TODO) the current step/module (activity?) will repeat. A (configurable) limit of 10 executions is set. Once exceeded, the process will exit with an error.
- **ACTIVITY_REPEAT**: (TODO)
