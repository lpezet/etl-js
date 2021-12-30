import { Executor } from "./executors";
import Context from "./context";
import TemplateEngine from "./templating/engine";
import { IETL } from "./etl";

export type ModSettings = {
  disabled?: boolean;
  // [key: string]: any;
};

export interface ModParameters {
  parent: string;
  config: any;
  executor: Executor;
  context: Context;
}

export enum ModStatus {
  CONTINUE,
  STOP,
  REPEAT,
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
  mTemplateEngine: TemplateEngine | null = null;
  constructor(pModName: string, pSettings?: S) {
    this.mSettings = pSettings || ({ disabled: false } as S);
    this.mModName = pModName;
    this.mDisabled = pSettings?.disabled || false;
    this.mETL = null;
  }
  set templateEngine(pEngine: TemplateEngine | null) {
    this.mTemplateEngine = pEngine;
  }
  get templateEngine(): TemplateEngine | null {
    return this.mTemplateEngine;
  }
  evaluate(
    pTemplate: string,
    pContext: Context,
    pDefault: string[] | null = null
  ): string[] | null {
    if (this.mTemplateEngine === null) return null;
    if (!pTemplate || typeof pTemplate !== "string") return pDefault;
    if (!pTemplate.includes("{{")) return pDefault;
    return this.mTemplateEngine.evaluate(pTemplate, pContext);
  }
  evaluateSingle(
    pTemplate: string,
    pContext: Context,
    pIndex: number,
    pDefault: string | null = null,
    pThrowIfOutOfBounds = true
  ): string | null {
    const values = this.evaluate(pTemplate, pContext);
    if (values === null) return pTemplate;
    if (values && values.length > pIndex) {
      return values[pIndex];
    } else {
      if (pThrowIfOutOfBounds) {
        throw new Error(
          "Unbalanced template (resolved to " +
            values.length +
            " elements but wanted #" +
            pIndex +
            ")."
        );
      }
      return pDefault;
    }
  }
  evaluateObject(pTemplate: any, pContext: Context): any | null {
    if (this.mTemplateEngine === null) return null;
    const result: any = {};
    this.mTemplateEngine.evaluateObject(pTemplate, pContext, result);
    return result;
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
