import {
  getLogger,
  Logger as log4jLogger,
  Configuration as log4jsConfiguration,
  configure as log4jsConfigure,
  shutdown as log4jsShutdown
} from "log4js";

export type Logger = log4jLogger;

export type Configuration = log4jsConfiguration;

/**
 *
 * @param cb callback
 * @return void
 */
export function loggerShutdown(cb?: (error: Error) => void): void | null {
  return log4jsShutdown(cb);
}

/**
 * @param name name
 * @return Logger
 */
export function createLogger(name: string): Logger {
  return getLogger(name);
}

/**
 * @param config config
 */
export function configureLogger(config: Configuration): void {
  log4jsConfigure(config);
}
