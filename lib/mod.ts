import { Executor } from "./executors";
import Context from "./context";
import { IETL } from "./etl";

export abstract class AbstractMod<T> implements Mod {
  mSettings?: T;
  mModName: string;
  constructor(pModName: string, pSettings?: T) {
    this.mSettings = pSettings;
    this.mModName = pModName;
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
  abstract handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ): Promise<any>;
}

export default interface Mod {
  register(pETL: IETL): void;
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ): Promise<any>;
}
