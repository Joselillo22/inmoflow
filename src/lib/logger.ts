import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const logger = pino({
  level: isProduction ? "info" : "debug",
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(!isProduction && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss" },
    },
  }),
});

export const emailLogger = logger.child({ service: "email-parser" });
export const whatsappLogger = logger.child({ service: "whatsapp" });
export const cronLogger = logger.child({ service: "cron" });
export const authLogger = logger.child({ service: "auth" });
export const apiLogger = logger.child({ service: "api" });
export const automationLogger = logger.child({ service: "automation" });

export default logger;
