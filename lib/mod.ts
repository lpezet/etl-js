import { Executor } from "./executors";
import Context from "./context";

export default interface Mod {
  handle(
    pParent: string,
    pConfig: any,
    pExecutor: Executor,
    pContext: Context
  ): Promise<any>;
}
