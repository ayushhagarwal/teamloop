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

export class WorkspaceService {
  constructor(
    private readonly db: PrismaClient,
    private readonly encryptionKey?: string,
  ) {}

  async saveInstallation(input: InstallationRecord): Promise<void> {
    await this.db.workspace.upsert({
      where: { slackTeamId: input.teamId },
      update: {
        ...(input.teamName ? { name: input.teamName } : {}),
        ...(input.botUserId ? { botUserId: input.botUserId } : {}),
        ...(input.installedBy ? { installedBySlackUserId: input.installedBy } : {}),
        accessToken: this.encrypt(input.botToken),
        uninstalledAt: null,
      },
      create: {
        slackTeamId: input.teamId,
        ...(input.teamName ? { name: input.teamName } : {}),
        ...(input.botUserId ? { botUserId: input.botUserId } : {}),
        ...(input.installedBy ? { installedBySlackUserId: input.installedBy } : {}),
        accessToken: this.encrypt(input.botToken),
      },
    });
  }

  async getBotToken(teamId: string): Promise<string | null> {
    const workspace = await this.db.workspace.findUnique({
      where: { slackTeamId: teamId },
      select: { accessToken: true, uninstalledAt: true },
    });
    if (!workspace?.accessToken || workspace.uninstalledAt) return null;
    return this.decrypt(workspace.accessToken);
  }

  async getBotTokenByWorkspaceId(workspaceId: string): Promise<string | null> {
    const workspace = await this.db.workspace.findUnique({
      where: { id: workspaceId },
      select: { accessToken: true, uninstalledAt: true },
    });
    if (!workspace?.accessToken || workspace.uninstalledAt) return null;
    return this.decrypt(workspace.accessToken);
  }

  async getInstallation(teamId: string): Promise<StoredInstallation | null> {
    const workspace = await this.db.workspace.findUnique({
      where: { slackTeamId: teamId },
      select: {
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
      botToken: this.decrypt(workspace.accessToken),
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

  private encrypt(value: string): string {
    if (!this.encryptionKey) return value;
    const key = Buffer.from(this.encryptionKey, "base64");
    if (key.length !== 32) {
      throw new Error("TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [
      "v1",
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      encrypted.toString("base64"),
    ].join(".");
  }

  private decrypt(value: string): string {
    if (!value.startsWith("v1.")) return value;
    if (!this.encryptionKey) {
      throw new Error("TOKEN_ENCRYPTION_KEY is required to decrypt OAuth tokens.");
    }
    const [, ivValue, tagValue, encryptedValue] = value.split(".");
    if (!ivValue || !tagValue || !encryptedValue)
      throw new Error("Invalid token payload.");
    const key = Buffer.from(this.encryptionKey, "base64");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivValue, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
