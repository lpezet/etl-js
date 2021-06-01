import { expect } from "chai";
import { Logger, configureLogger, createLogger } from "../../lib/rearch/logger";

describe("logger", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createLogger("logger");
  });

  after(() => {
    configureLogger({
      appenders: {
        console: { type: "console", layout: { type: "colored" } }
      },
      categories: {
        default: { appenders: ["console"], level: "off" }
      }
    });
  });

  it("configure logger", () => {
    expect(
      configureLogger({
        appenders: {
          console: { type: "console", layout: { type: "colored" } }
        },
        categories: {
          default: { appenders: ["console"], level: "all" }
        }
      })
    ).to.not.throw;
  });

  describe("log", () => {
    it("debug", () => {
      expect(logger.debug("Debug message")).to.not.throw;
    });
    it("info", () => {
      expect(logger.info("Info message")).to.not.throw;
    });
    it("error", () => {
      expect(logger.error("Error message")).to.not.throw;
    });
    it("fatal", () => {
      expect(logger.fatal("Fatal message")).to.not.throw;
    });
    it("trace", () => {
      expect(logger.trace("Trace message")).to.not.throw;
    });
    it("warn", () => {
      expect(logger.warn("Warn message")).to.not.throw;
    });
    it("mark", () => {
      expect(logger.mark("Mark message")).to.not.throw;
    });
  });
});
