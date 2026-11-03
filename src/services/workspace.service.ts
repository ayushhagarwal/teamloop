import { ReminderStatus, type PrismaClient } from "@prisma/client";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface InstallationRecord {
  teamId: string;
  teamName?: string;
  botUserId?: string;
  installedBy?: string;
  botToken: string;
}

export interface StoredInstallation {
  teamId: string;
  teamName?: string;
  botUserId?: string;
  installedBy?: string;
  botToken: string;
}

interface TokenPayload {
  iv: Buffer;
  tag: Buffer;
  encrypted: Buffer;
}

export class WorkspaceService {
  constructor(
    private readonly db: PrismaClient,
    private readonly encryptionKey?: string,
  ) {}

  async saveInstallation(input: InstallationRecord): Promise<void> {
    const key = this.keyOrThrow("store");
    const workspace = await this.db.workspace.upsert({
      where: { slackTeamId: input.teamId },
      update: {
        ...(input.teamName ? { name: input.teamName } : {}),
        ...(input.botUserId ? { botUserId: input.botUserId } : {}),
        ...(input.installedBy ? { installedBySlackUserId: input.installedBy } : {}),
        uninstalledAt: null,
      },
      create: {
        slackTeamId: input.teamId,
        ...(input.teamName ? { name: input.teamName } : {}),
        ...(input.botUserId ? { botUserId: input.botUserId } : {}),
        ...(input.installedBy ? { installedBySlackUserId: input.installedBy } : {}),
      },
      select: { id: true },
    });
    await this.db.workspace.update({
      where: { id: workspace.id },
      data: { accessToken: this.encrypt(input.botToken, workspace.id, key) },
    });
  }

  async getBotToken(teamId: string): Promise<string | null> {
    const workspace = await this.db.workspace.findUnique({
      where: { slackTeamId: teamId },
      select: { id: true, accessToken: true, uninstalledAt: true },
    });
    if (!workspace?.accessToken || workspace.uninstalledAt) return null;
    return this.decrypt(workspace.accessToken, workspace.id);
  }

  async getBotTokenByWorkspaceId(workspaceId: string): Promise<string | null> {
    const workspace = await this.db.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, accessToken: true, uninstalledAt: true },
    });
    if (!workspace?.accessToken || workspace.uninstalledAt) return null;
    return this.decrypt(workspace.accessToken, workspace.id);
  }

  async getInstallation(teamId: string): Promise<StoredInstallation | null> {
    const workspace = await this.db.workspace.findUnique({
      where: { slackTeamId: teamId },
      select: {
        id: true,
        slackTeamId: true,
        name: true,
        botUserId: true,
        installedBySlackUserId: true,
        accessToken: true,
        uninstalledAt: true,
      },
    });
    if (!workspace?.accessToken || workspace.uninstalledAt) return null;
    return {
      teamId: workspace.slackTeamId,
      ...(workspace.name ? { teamName: workspace.name } : {}),
      ...(workspace.botUserId ? { botUserId: workspace.botUserId } : {}),
      ...(workspace.installedBySlackUserId
        ? { installedBy: workspace.installedBySlackUserId }
        : {}),
      botToken: this.decrypt(workspace.accessToken, workspace.id),
    };
  }

  async markUninstalled(teamId: string): Promise<void> {
    const workspace = await this.db.workspace.findUnique({
      where: { slackTeamId: teamId },
      select: { id: true },
    });
    if (!workspace) return;
    await this.db.$transaction([
      this.db.workspace.update({
        where: { id: workspace.id },
        data: { uninstalledAt: new Date(), accessToken: null },
      }),
      this.db.reminder.updateMany({
        where: {
          event: { workspaceId: workspace.id },
          status: ReminderStatus.PENDING,
        },
        data: { status: ReminderStatus.CANCELLED },
      }),
    ]);
  }

  private encrypt(value: string, workspaceId: string, key: Buffer): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(workspaceId, "utf8"));
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [
      "v1",
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      encrypted.toString("base64"),
    ].join(".");
  }

  private decrypt(value: string, workspaceId: string): string {
    const payload = this.parsePayload(value);
    const key = this.keyOrThrow("decrypt");
    try {
      return this.open(payload, key, workspaceId);
    } catch {
      try {
        return this.open(payload, key);
      } catch {
        throw new Error("Invalid token payload.");
      }
    }
  }

  private open(payload: TokenPayload, key: Buffer, workspaceId?: string): string {
    const decipher = createDecipheriv("aes-256-gcm", key, payload.iv);
    if (workspaceId !== undefined) {
      decipher.setAAD(Buffer.from(workspaceId, "utf8"));
    }
    decipher.setAuthTag(payload.tag);
    return Buffer.concat([
      decipher.update(payload.encrypted),
      decipher.final(),
    ]).toString("utf8");
  }

  private parsePayload(value: string): TokenPayload {
    const parts = value.split(".");
    if (parts.length !== 4 || parts[0] !== "v1") {
      throw new Error("Invalid token payload.");
    }
    const iv = decodePart(parts[1]);
    const tag = decodePart(parts[2]);
    const encrypted = decodePart(parts[3]);
    if (!iv || !tag || !encrypted || iv.length !== 12 || tag.length !== 16) {
      throw new Error("Invalid token payload.");
    }
    return { iv, tag, encrypted };
  }

  private keyOrThrow(purpose: "store" | "decrypt"): Buffer {
    if (!this.encryptionKey) {
      throw new Error(
        purpose === "store"
          ? "TOKEN_ENCRYPTION_KEY is required to store OAuth tokens."
          : "TOKEN_ENCRYPTION_KEY is required to decrypt OAuth tokens.",
      );
    }
    const key = Buffer.from(this.encryptionKey, "base64");
    if (key.length !== 32) {
      throw new Error("TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
    }
    return key;
  }
}

function decodePart(value: string | undefined): Buffer | undefined {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return undefined;
  const buffer = Buffer.from(value, "base64");
  if (buffer.length === 0) return undefined;
  return buffer;
}
