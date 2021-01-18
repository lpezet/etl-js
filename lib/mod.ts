import { Executor } from "./executors";
import Context from "./context";
import { IETL } from "./etl";

export type ModSettings = {
  disabled: boolean;
  [key: string]: any;
};

export abstract class AbstractMod<T extends ModSettings> implements Mod {
  mSettings?: T;
  mModName: string;
  mDisabled: boolean;
  mETL: IETL | null;
  constructor(pModName: string, pSettings?: T) {
    this.mSettings = pSettings;
    this.mModName = pModName;
    this.mDisabled = pSettings?.disabled || false;
    this.mETL = null;
  }
  register(pETL: IETL): void {
    if (pETL == null) throw new Error("ETL must not be null to register.");
    this.mETL = pETL;
    pETL.mod(this.mModName, this, (pSettings: T) => {
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
  abstract handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ): Promise<any>;
}

export default interface Mod {
  isDisabled(): boolean;
  register(pETL: IETL): void;
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ): Promise<any>;
}
