import { createLogger } from "../../../lib/rearch/logger";
import { AbstractMod, createModResult, ModStatus } from "../../../lib/rearch/mod";
import { ModParameters, ModResult } from "../../../lib/rearch/mod";

const LOGGER = createLogger("etljs::etl::test");

export default class ModMod extends AbstractMod<any,any> {
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
        "[%s] In mod mod. Settings: hello=%s",
        pParams.parent,
        this.mSettings["hello"]
      );
      resolve(createModResult(ModStatus.DONE));
    });
  }
}
