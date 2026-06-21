import "dotenv/config";
import { z } from "zod";

const optionalSecret = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    DATABASE_URL: z.string().min(1),
    APP_BASE_URL: z.string().url().default("http://localhost:3000"),
    DEFAULT_TIMEZONE: z.string().default("UTC"),
    SLACK_SIGNING_SECRET: z.string().min(1),
    SLACK_BOT_TOKEN: optionalSecret,
    SLACK_CLIENT_ID: optionalSecret,
    SLACK_CLIENT_SECRET: optionalSecret,
    SLACK_STATE_SECRET: optionalSecret,
    TOKEN_ENCRYPTION_KEY: optionalSecret,
  })
  .superRefine((value, context) => {
    if (
      !value.SLACK_BOT_TOKEN &&
      (!value.SLACK_CLIENT_ID || !value.SLACK_CLIENT_SECRET)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SLACK_BOT_TOKEN"],
        message:
          "Set SLACK_BOT_TOKEN for local development or configure SLACK_CLIENT_ID and SLACK_CLIENT_SECRET for OAuth.",
      });
    }

    if (
      value.SLACK_CLIENT_ID &&
      value.SLACK_CLIENT_SECRET &&
      (!value.SLACK_STATE_SECRET || value.SLACK_STATE_SECRET.length < 32)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SLACK_STATE_SECRET"],
        message: "SLACK_STATE_SECRET must be at least 32 characters for OAuth.",
      });
    }
    if (value.SLACK_BOT_TOKEN && value.SLACK_CLIENT_ID) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SLACK_BOT_TOKEN"],
        message: "Use either local bot-token mode or OAuth mode, not both.",
      });
    }
    if (value.SLACK_CLIENT_ID && !isEncryptionKey(value.TOKEN_ENCRYPTION_KEY)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["TOKEN_ENCRYPTION_KEY"],
        message: "OAuth mode requires a base64-encoded 32-byte encryption key.",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

function isEncryptionKey(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}
