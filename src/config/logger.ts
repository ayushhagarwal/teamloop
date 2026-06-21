type LogLevel = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

const priorities: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  constructor(private readonly level: LogLevel = "info") {}

  debug(message: string, context: Context = {}): void {
    this.write("debug", message, context);
  }

  info(message: string, context: Context = {}): void {
    this.write("info", message, context);
  }

  warn(message: string, context: Context = {}): void {
    this.write("warn", message, context);
  }

  error(message: string, context: Context = {}): void {
    this.write("error", message, context);
  }

  private write(level: LogLevel, message: string, context: Context): void {
    if (priorities[level] < priorities[this.level]) return;
    const payload = JSON.stringify({
      time: new Date().toISOString(),
      level,
      message,
      ...sanitize(context),
    });
    if (level === "error") console.error(payload);
    else if (level === "warn") console.warn(payload);
    else console.log(payload);
  }
}

function sanitize(context: Context): Context {
  const blocked = new Set(["token", "accessToken", "clientSecret", "signingSecret"]);
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      blocked.has(key) ? "[REDACTED]" : value,
    ]),
  );
}
