import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});

// Helper to create a child logger with request context
export function requestLogger(context: {
  requestId?: string | null;
  userId?: string | null;
  projectId?: string | null;
  route?: string;
}) {
  return logger.child(context);
}
