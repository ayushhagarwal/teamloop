import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadEnv } from "../config/env.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const base = {
  DATABASE_URL: "postgresql://teamloop:CHANGE_ME@postgres:5432/teamloop",
  SLACK_SIGNING_SECRET: "signing-secret",
};

const oauth = {
  SLACK_CLIENT_ID: "client-id",
  SLACK_CLIENT_SECRET: "client-secret",
  SLACK_STATE_SECRET: "a".repeat(32),
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
};

describe("environment configuration", () => {
  it("accepts blank optional OAuth fields in local bot-token mode", () => {
    const env = loadEnv({
      ...base,
      SLACK_BOT_TOKEN: "xoxb-test",
      SLACK_CLIENT_ID: "",
      SLACK_CLIENT_SECRET: "",
      SLACK_STATE_SECRET: "",
      TOKEN_ENCRYPTION_KEY: "",
    });
    expect(env.SLACK_CLIENT_ID).toBeUndefined();
  });

  it("requires token encryption for OAuth mode", () => {
    expect(() =>
      loadEnv({
        ...base,
        SLACK_CLIENT_ID: "client-id",
        SLACK_CLIENT_SECRET: "client-secret",
        SLACK_STATE_SECRET: "a".repeat(32),
      }),
    ).toThrow("TOKEN_ENCRYPTION_KEY");
  });

  it("requires canonical base64 for the OAuth encryption key", () => {
    const validKey = Buffer.alloc(32, 7).toString("base64");
    expect(
      loadEnv({
        ...base,
        SLACK_CLIENT_ID: "client-id",
        SLACK_CLIENT_SECRET: "client-secret",
        SLACK_STATE_SECRET: "a".repeat(32),
        TOKEN_ENCRYPTION_KEY: validKey,
      }).TOKEN_ENCRYPTION_KEY,
    ).toBe(validKey);
    expect(() =>
      loadEnv({
        ...base,
        SLACK_CLIENT_ID: "client-id",
        SLACK_CLIENT_SECRET: "client-secret",
        SLACK_STATE_SECRET: "a".repeat(32),
        TOKEN_ENCRYPTION_KEY: `${validKey}ignored`,
      }),
    ).toThrow("TOKEN_ENCRYPTION_KEY");
  });

  it("requires HTTPS for non-local OAuth redirects in every environment", () => {
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: "development",
        APP_BASE_URL: "http://teamloop.example",
        ...oauth,
      }),
    ).toThrow("APP_BASE_URL");
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: "production",
        APP_BASE_URL: "http://teamloop.example",
        ...oauth,
      }),
    ).toThrow("APP_BASE_URL");
    expect(
      loadEnv({ ...base, APP_BASE_URL: "http://localhost:3000", ...oauth })
        .APP_BASE_URL,
    ).toBe("http://localhost:3000");
    expect(
      loadEnv({ ...base, APP_BASE_URL: "http://127.0.0.1:3000", ...oauth })
        .APP_BASE_URL,
    ).toBe("http://127.0.0.1:3000");
    expect(
      loadEnv({
        ...base,
        NODE_ENV: "production",
        APP_BASE_URL: "https://teamloop.example",
        ...oauth,
      }).APP_BASE_URL,
    ).toBe("https://teamloop.example");
  });

  it("keeps public HTTP available for local bot-token mode", () => {
    expect(
      loadEnv({
        ...base,
        APP_BASE_URL: "http://teamloop.example",
        SLACK_BOT_TOKEN: "xoxb-test",
      }).APP_BASE_URL,
    ).toBe("http://teamloop.example");
  });

  it("keeps the sample database password out of Compose and the env example", () => {
    const compose = readFileSync(resolve(root, "docker-compose.yml"), "utf8");
    const example = readFileSync(resolve(root, ".env.example"), "utf8");
    expect(compose).not.toContain("5432:5432");
    expect(compose).not.toContain("POSTGRES_PASSWORD: teamloop");
    expect(compose).not.toContain("teamloop:teamloop");
    expect(compose).toContain("${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}");
    expect(compose).toContain("${DATABASE_URL:?Set DATABASE_URL}");
    expect(example).toContain("POSTGRES_PASSWORD=CHANGE_ME");
    expect(example).toContain("postgresql://teamloop:CHANGE_ME@");
    expect(example).not.toContain("teamloop:teamloop");
  });
});
