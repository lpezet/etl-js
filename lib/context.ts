export interface ETLContext {
  activityIndex: number;
  activityId: string | null;
  stepName: string | null;
}

export default interface Context {
  env: { [key: string]: any };
  vars: { [key: string]: any };
  etl: ETLContext;
  [key: string]: any;
}

/**
 * @return new empty Context
 */
export function emptyContext(): Context {
  return {
    vars: {},
    env: {},
    etl: { activityId: null, activityIndex: 0, stepName: null }
  };
}
