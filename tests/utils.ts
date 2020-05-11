import * as Fs from "fs";
import * as path from "path";
import { yamlParse } from "yaml-cfn";

export function load_file(pFilename: string): any {
  const oFilePath = path.resolve(__dirname, pFilename);
  const oFileContent = Fs.readFileSync(oFilePath, { encoding: "utf8" });
  return yamlParse(oFileContent);
}
