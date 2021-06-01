import { createLogger } from "../../../lib/rearch/logger";
import {
  AbstractMod,
  ModParameters,
  ModResult,
  ModStatus,
  createModResult
} from "../../../lib/rearch/mod";

const LOGGER = createLogger("etljs::etl::test");

export default class TestMod extends AbstractMod<any, any> {
  mSettings: any;
  mCalls: number;
  constructor(pSettings?: any) {
    super("tester", pSettings || {});
    this.mCalls = 0;
  }
  calls(): number {
    return this.mCalls;
  }
  handle(pParams: ModParameters): Promise<ModResult<any>> {
    return new Promise((resolve, _reject) => {
      this.mCalls++;
      LOGGER.debug(
        "[%s] In test mod. Settings: hello=%s",
        pParams.parent,
        this.mSettings["hello"]
      );
      resolve(createModResult(ModStatus.CONTINUE));
    });
  }
}
