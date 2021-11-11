import { Executor } from "./executors";
import Context from "./context";
import { IETL } from "./etl";

export type ModSettings = {
  disabled: boolean;
  // [key: string]: any;
};

export interface ModParameters {
  parent: string;
  config: any;
  executor: Executor;
  context: Context;
}

// TODO: This is NOT really a "status" but a "what to do next". We say "CONTINUE" because we're actually "DONE".
// This creates confusion and make it looking at a "state" not very intuitive.
// For exmaple:
/*
const oState = {
  id: "activity1",
  status: ActivityStatus.STOP,
  state: {
    stoppable: {
      status: ModStatus.CONTINUE,
      state: undefined,
      error: undefined
    },
    stoppable2: {
      status: ModStatus.STOP,
      state: undefined,
      error: undefined
    }
  }
};
*/
// It's not intuitive to see right away that "stopabble" is DONE, and we need to restart from stoppable2 cause it said "STOP".
export enum ModStatus {
  CONTINUE, // change to DONE
  STOP, // this is to stop the current process to continue "offline". But in a "resuming state" point of view, should it be more like "IN_PROGRESS"?
  REPEAT, //
  SKIP,
  EXIT
}

export class ModError extends Error {}

export interface ModResult<T> {
  status: ModStatus;
  state?: T;
  error?: ModError;
  [key: string]: any;
}

export default interface Mod<T> {
  isDisabled(): boolean;
  register(pETL: IETL): void;
  handle(pParams: ModParameters): Promise<ModResult<T>>;
}

/**
 * @param pStatus status
 * @param pState state
 * @param pError error
 * @return ModResult
 */
export function createModResult<T>(
  pStatus: ModStatus,
  pState?: T,
  pError?: ModError
): ModResult<T> {
  return {
    status: pStatus,
    state: pState,
    error: pError
  };
}
export abstract class AbstractMod<T, S extends ModSettings> implements Mod<T> {
  mSettings: S;
  mModName: string;
  mDisabled: boolean;
  mETL: IETL | null;
  constructor(pModName: string, pSettings?: S) {
    this.mSettings = pSettings || ({ disabled: false } as S);
    this.mModName = pModName;
    this.mDisabled = pSettings?.disabled || false;
    this.mETL = null;
  }
  register(pETL: IETL): void {
    if (pETL == null) throw new Error("ETL must not be null to register.");
    this.mETL = pETL;
    pETL.mod(this.mModName, this, (pSettings: S) => {
      this.mSettings = {
        ...this.mSettings,
        ...pSettings
      };
    });
  }
  get name(): string {
    return this.mModName;
  }
  get etl(): IETL | null {
    return this.mETL;
  }
  isDisabled(): boolean {
    return this.mDisabled;
  }
  abstract handle(pParams: ModParameters): Promise<ModResult<T>>;
}
