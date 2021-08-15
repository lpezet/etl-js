import { createLogger } from "../../lib/logger";
import { AbstractMod, ModStatus, createModResult } from "../../lib/mod";
import { ModParameters, ModResult } from "../../lib/mod";

const LOGGER = createLogger("etljs::etl::test");

export default class ModMod extends AbstractMod<any, any> {
  mCalls: number;
  constructor(pSettings?: any) {
    super("moder", pSettings || {});
    this.mCalls = 0;
  }
  calls(): number {
    return this.mCalls;
  }
  handle(pParams: ModParameters): Promise<ModResult<any>> {
    return new Promise((resolve, _reject) => {
      this.mCalls++;
      LOGGER.debug(
        "[%s] [%s] Settings: hello=%s",
        pParams.parent,
        this.name,
        this.mSettings["hello"]
      );
      resolve(createModResult(ModStatus.STOP));
    });
  }
}
