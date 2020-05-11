import {
  getLogger,
  Logger as log4jLogger,
  Configuration as log4jsConfiguration,
  configure as log4jsConfigure,
} from "log4js";

export type Logger = log4jLogger;

export type Configuration = log4jsConfiguration;

/**
 * @param name
 * @return Logger
 */
export function createLogger(name: string): Logger {
  return getLogger(name);
}

/**
 * @param config
 */
export function configureLogger(config: Configuration): void {
  log4jsConfigure(config);
}
