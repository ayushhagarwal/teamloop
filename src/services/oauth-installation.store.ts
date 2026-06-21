import type { Installation, InstallationQuery, InstallationStore } from "@slack/oauth";
import { SLACK_SCOPES } from "../config/slack.js";
import { WorkspaceService } from "./workspace.service.js";

export class PrismaInstallationStore implements InstallationStore {
  constructor(private readonly workspaces: WorkspaceService) {}

  async storeInstallation<AuthVersion extends "v1" | "v2">(
    installation: Installation<AuthVersion, boolean>,
  ): Promise<void> {
    if (!installation.team?.id || !installation.bot?.token) {
      throw new Error("TeamLoop V1 supports workspace bot installations only.");
    }
    await this.workspaces.saveInstallation({
      teamId: installation.team.id,
      ...(installation.team.name ? { teamName: installation.team.name } : {}),
      botToken: installation.bot.token,
      botUserId: installation.bot.userId,
      installedBy: installation.user.id,
    });
  }

  async fetchInstallation(
    query: InstallationQuery<boolean>,
  ): Promise<Installation<"v1" | "v2", boolean>> {
    if (!query.teamId) {
      throw new Error("Enterprise organization installs are not supported in V1.");
    }
    const stored = await this.workspaces.getInstallation(query.teamId);
    if (!stored) throw new Error(`No TeamLoop installation found for ${query.teamId}.`);

    return {
      authVersion: "v2",
      isEnterpriseInstall: false,
      team: {
        id: stored.teamId,
        ...(stored.teamName ? { name: stored.teamName } : {}),
      },
      enterprise: undefined,
      user: {
        id: stored.installedBy ?? "UNKNOWN",
        token: undefined,
        scopes: undefined,
      },
      bot: {
        token: stored.botToken,
        id: stored.botUserId ?? "UNKNOWN",
        userId: stored.botUserId ?? "UNKNOWN",
        scopes: [...SLACK_SCOPES],
      },
      tokenType: "bot",
    };
  }

  async deleteInstallation(query: InstallationQuery<boolean>): Promise<void> {
    if (query.teamId) await this.workspaces.markUninstalled(query.teamId);
  }
}
