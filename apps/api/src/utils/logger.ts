import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const logsDir = path.join(__dirname, "..", "..", "logs");

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: "info",
  format: jsonFormat,
  transports: [
    // Stdout — all levels
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
          return `${timestamp} [${level}] ${message}${extra}`;
        })
      ),
    }),

    // Combined rotated log (info+)
    new DailyRotateFile({
      dirname: logsDir,
      filename: "combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      level: "info",
      format: jsonFormat,
    }) as unknown as winston.transport,

    // Error-only rotated log
    new DailyRotateFile({
      dirname: logsDir,
      filename: "error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      level: "error",
      format: jsonFormat,
    }) as unknown as winston.transport,
  ],
});

export default logger;
