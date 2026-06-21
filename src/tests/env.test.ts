import { describe, expect, it } from "vitest";
import { loadEnv } from "../config/env.js";

const base = {
  DATABASE_URL: "postgresql://teamloop:teamloop@localhost:5432/teamloop",
  SLACK_SIGNING_SECRET: "signing-secret",
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
});
