import type { JSONObject } from "./util.js";

type LogFn = (obj: JSONObject) => void;

/**
 * Generic logging interface that is compatible with Pino.
 */
export interface Logger {
  fatal: LogFn;
  error: LogFn;
  warn: LogFn;
  info: LogFn;
  debug: LogFn;
  trace: LogFn;
  silent: LogFn;
}

