import { Executor } from "./executors";
import Context from "./context";
import { IETL } from "./etl";

export type ModSettings = {
  disabled: boolean;
  [key: string]: any;
};


export interface ModParameters {
  parent: string;
  config: any;
  executor: Executor;
  context: Context;
}

export enum ModStatus {
  DONE,
  IN_PROGRESS,
  IN_ERROR
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
  mSettings?: S;
  mModName: string;
  mDisabled: boolean;
  mETL: IETL | null;
  constructor(pModName: string, pSettings?: S) {
    this.mSettings = pSettings;
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
