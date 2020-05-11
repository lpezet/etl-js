export default interface Context {
  env: { [key: string]: any };
  vars: { [key: string]: any };
  [key: string]: any;
}
