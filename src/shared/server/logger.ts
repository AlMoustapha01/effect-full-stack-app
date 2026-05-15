import { Layer, Logger, LogLevel } from "effect"
import { env } from "./env"

export const LoggerLive =
  env.NODE_ENV === "production"
    ? Logger.minimumLogLevel(LogLevel.Info)
    : Layer.merge(Logger.pretty, Logger.minimumLogLevel(LogLevel.Debug))
