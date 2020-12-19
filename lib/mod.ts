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
  constructor(pModName: string, pSettings?: T) {
    this.mSettings = pSettings;
    this.mModName = pModName;
    this.mDisabled = pSettings?.disabled || false;
  }
  register(pETL: IETL): void {
    if (pETL == null) throw new Error("ETL must not be null to register.");
    pETL.mod(this.mModName, this, (pSettings: T) => {
      this.mSettings = {
        ...this.mSettings,
        ...pSettings
      };
    });
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
