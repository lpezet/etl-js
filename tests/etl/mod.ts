import { createLogger } from "../../lib/logger";
import { AbstractMod } from "../../lib/mod";
import { Executor } from "../../lib/executors";

const LOGGER = createLogger("etljs::etl::test");

export default class ModMod extends AbstractMod<any> {
  mCalls: number;
  constructor(pSettings?: any) {
    super("moder", pSettings || {});
    this.mCalls = 0;
  }
  calls(): number {
    return this.mCalls;
  }
  handle(pParent: string, _pConfig: any, _pExecutor: Executor): Promise<any> {
    return new Promise((resolve, _reject) => {
      this.mCalls++;
      LOGGER.debug(
        "[%s] In mod mod. Settings: hello=%s",
        pParent,
        this.mSettings["hello"]
      );
      resolve();
    });
  }
}
