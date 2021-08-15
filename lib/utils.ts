import { createLogger } from "./logger";

const LOGGER = createLogger("etljs2::utils");

type ETLSets = {
  [key: string]: Array<string | ETLSetRef>;
};
type ETLSetRef = {
  etlSet: string;
};
type ETLSetStackItem = {
  key: string;
  value: Array<string | ETLSetRef>;
  tries: number;
};

/**
 * @param pETLs
 */
export function resolveEtlSets(pETLs: ETLSets): any {
  const oStack: ETLSetStackItem[] = [];
  Object.keys(pETLs).forEach(i => {
    oStack.push({ key: i, value: pETLs[i], tries: 0 });
  });
  let s: ETLSetStackItem | undefined;
  const oResolved: any = {};
  while (oStack.length > 0) {
    s = oStack.shift();
    if (s === undefined) {
      LOGGER.error(
        "Expected more elements in stack: length=" + oStack.length,
        oStack
      );
      break; // TODO:???
    }
    const k = s.key;
    // console.log('## Working on: ' + k);
    let nv: any[] = []; // new values
    let oResolveLater = false;
    const val = s.value;
    if (Array.isArray(val)) {
      s.value.forEach(v => {
        const oValType = typeof v;
        switch (oValType) {
          case "string":
            nv.push(v);
            break;
          case "object": {
            const oRef: string = (v as ETLSetRef).etlSet;

            // TODO: throw error if not present
            if (!oResolved[oRef]) {
              // console.log( 'Need to resolve later: ' + k);
              if (s != undefined) {
                if (s.tries > 5) {
                  throw new Error(
                    "Infinite loop detected with (at least) entry [" + k + "]."
                  );
                }
                s.tries++;
                oStack.push(s); // resolve it later
              }

              oResolveLater = true;
            } else {
              nv = nv.concat(oResolved[oRef]);
            }
            break;
          }
          default:
            throw new Error(k + ": value type " + oValType + " not supported.");
        }
        if (oResolveLater) return;
      });
    } else {
      nv.push(val);
    }
    if (!oResolveLater) {
      // console.log("### Resolved " + k);
      oResolved[k] = nv;
    }
  }
  return oResolved;
}

/**
 * @param pConfig
 * @param pParameters
 * @return array of activity keys
 */
export function resolveActivities(pConfig: any, pParameters?: any): string[] {
  if (pConfig["etl"]) return (pConfig["etl"] as Array<string>).map(k => k);
  if (pConfig["etlSets"]) {
    const oResolvedETLs = resolveEtlSets(pConfig["etlSets"] as ETLSets);
    const etlSet =
      oResolvedETLs[(pParameters ? pParameters["etlSet"] : null) || "default"];
    if (etlSet) return etlSet;
    LOGGER.warn(
      "Could not find etlSet [%s]. Using it as an activity name instead.",
      pParameters["etlSet"]
    );
    return [pParameters["etlSet"]]; // as activity
  } else {
    if (pConfig === "" || (Array.isArray(pConfig) && pConfig.length === 0)) {
      throw new Error(
        "Either etl, etlSets, or some root element must be provided in template."
      );
    }
    const root = Object.keys(pConfig)[0];
    return [root];
  }
}
