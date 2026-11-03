import type { PrismaClient } from "@prisma/client";
import { createCipheriv, randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceService } from "../services/workspace.service.js";

const key = Buffer.alloc(32, 7).toString("base64");

interface WorkspaceRow {
  id: string;
  slackTeamId: string;
  name: string | null;
  botUserId: string | null;
  installedBySlackUserId: string | null;
  accessToken: string | null;
  uninstalledAt: Date | null;
}

function database() {
  const rows: WorkspaceRow[] = [];
  let sequence = 0;
  const db = {
    workspace: {
      upsert: vi.fn(
        async (args: {
          where: { slackTeamId: string };
          create: { slackTeamId: string; name?: string; botUserId?: string };
          update: Partial<WorkspaceRow>;
        }) => {
          let row = rows.find((item) => item.slackTeamId === args.where.slackTeamId);
          if (!row) {
            row = {
              id: `ws_${++sequence}`,
              slackTeamId: args.create.slackTeamId,
              name: args.create.name ?? null,
              botUserId: args.create.botUserId ?? null,
              installedBySlackUserId: null,
              accessToken: null,
              uninstalledAt: null,
            };
            rows.push(row);
          } else {
            Object.assign(row, args.update);
          }
          return { id: row.id };
        },
      ),
      update: vi.fn(
        async (args: { where: { id: string }; data: Partial<WorkspaceRow> }) => {
          const row = rows.find((item) => item.id === args.where.id);
          if (!row) throw new Error("missing workspace");
          Object.assign(row, args.data);
          return row;
        },
      ),
      findUnique: vi.fn(
        async (args: { where: { id?: string; slackTeamId?: string } }) => {
          return (
            rows.find((item) =>
              args.where.id
                ? item.id === args.where.id
                : item.slackTeamId === args.where.slackTeamId,
            ) ?? null
          );
        },
      ),
    },
  };
  return { db: db as unknown as PrismaClient, rows };
}

function legacyCiphertext(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

describe("WorkspaceService token storage", () => {
  it("refuses to persist a token when the encryption key is absent", async () => {
    const { db } = database();
    const service = new WorkspaceService(db);
    await expect(
      service.saveInstallation({ teamId: "T1", botToken: "xoxb-secret" }),
    ).rejects.toThrow("TOKEN_ENCRYPTION_KEY is required to store");
    expect(db.workspace.upsert).not.toHaveBeenCalled();
  });

  it("stores versioned ciphertext bound to the workspace id", async () => {
    const { db, rows } = database();
    const service = new WorkspaceService(db, key);
    await service.saveInstallation({ teamId: "T1", botToken: "xoxb-secret" });
    const stored = rows[0]?.accessToken ?? "";
    expect(stored.startsWith("v1.")).toBe(true);
    expect(stored).not.toContain("xoxb-secret");
    await expect(service.getBotToken("T1")).resolves.toBe("xoxb-secret");

    const copied = rows[0];
    if (!copied?.accessToken) throw new Error("missing ciphertext");
    rows.push({
      ...copied,
      id: "ws_other",
      slackTeamId: "T2",
    });
    await expect(service.getBotToken("T2")).rejects.toThrow("Invalid token payload");
  });

  it("still decrypts v1 ciphertext written without workspace AAD", async () => {
    const { db, rows } = database();
    rows.push({
      id: "ws_legacy",
      slackTeamId: "T_LEGACY",
      name: null,
      botUserId: null,
      installedBySlackUserId: null,
      accessToken: legacyCiphertext("xoxb-legacy"),
      uninstalledAt: null,
    });
    const service = new WorkspaceService(db, key);
    await expect(service.getBotToken("T_LEGACY")).resolves.toBe("xoxb-legacy");
  });

  it("rejects stored values that are not versioned AES-GCM payloads", async () => {
    const { db, rows } = database();
    rows.push({
      id: "ws_plain",
      slackTeamId: "T_PLAIN",
      name: null,
      botUserId: null,
      installedBySlackUserId: null,
      accessToken: "xoxb-plaintext",
      uninstalledAt: null,
    });
    const service = new WorkspaceService(db, key);
    await expect(service.getBotToken("T_PLAIN")).rejects.toThrow(
      "Invalid token payload",
    );
  });
});
