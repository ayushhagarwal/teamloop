import { App, ExpressReceiver } from "@slack/bolt";
import type { ScheduledTask } from "node-cron";
import { registerDinnerCommand } from "./commands/dinner.command.js";
import { registerHyroxCommand } from "./commands/hyrox.command.js";
import { registerLunchCommand } from "./commands/lunch.command.js";
import { registerMarathonCommand } from "./commands/marathon.command.js";
import { registerPotluckCommand } from "./commands/potluck.command.js";
import { registerWeekendRunCommand } from "./commands/weekendrun.command.js";
import type { Env } from "./config/env.js";
import { Logger } from "./config/logger.js";
import { SLACK_ENDPOINTS, SLACK_SCOPES } from "./config/slack.js";
import { prisma } from "./db/prisma.js";
import { registerEventSubmissionHandlers } from "./interactions/event-submissions.js";
import { registerOrganizerActions } from "./interactions/organizer.actions.js";
import { registerPotluckActions } from "./interactions/potluck.actions.js";
import { registerPreferenceActions } from "./interactions/preference.actions.js";
import { registerRsvpActions } from "./interactions/rsvp.actions.js";
import { startReminderJob } from "./jobs/reminder.job.js";
import { EventService } from "./services/event.service.js";
import { PrismaInstallationStore } from "./services/oauth-installation.store.js";
import { PotluckService } from "./services/potluck.service.js";
import { PreferenceService } from "./services/preference.service.js";
import { ReminderService } from "./services/reminder.service.js";
import { RsvpService } from "./services/rsvp.service.js";
import { SlackMessageService } from "./services/slack-message.service.js";
import { WorkspaceService } from "./services/workspace.service.js";

export interface TeamLoopRuntime {
  app: App;
  receiver: ExpressReceiver;
  logger: Logger;
  startJobs: () => ScheduledTask;
}

export function createTeamLoopApp(env: Env): TeamLoopRuntime {
  const logger = new Logger(env.LOG_LEVEL);
  const workspaces = new WorkspaceService(prisma, env.TOKEN_ENCRYPTION_KEY);
  const receiver =
    env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET && env.SLACK_STATE_SECRET
      ? new ExpressReceiver({
          signingSecret: env.SLACK_SIGNING_SECRET,
          endpoints: SLACK_ENDPOINTS.events,
          clientId: env.SLACK_CLIENT_ID,
          clientSecret: env.SLACK_CLIENT_SECRET,
          stateSecret: env.SLACK_STATE_SECRET,
          redirectUri: `${env.APP_BASE_URL}${SLACK_ENDPOINTS.oauthRedirect}`,
          scopes: [...SLACK_SCOPES],
          installationStore: new PrismaInstallationStore(workspaces),
          installerOptions: {
            installPath: SLACK_ENDPOINTS.install,
            redirectUriPath: SLACK_ENDPOINTS.oauthRedirect,
          },
        })
      : new ExpressReceiver({
          signingSecret: env.SLACK_SIGNING_SECRET,
          endpoints: SLACK_ENDPOINTS.events,
        });
  receiver.app.get("/health", (_request, response) => {
    response.status(200).json({ ok: true, service: "teamloop" });
  });

  const app = new App({
    receiver,
    ...(env.SLACK_BOT_TOKEN ? { token: env.SLACK_BOT_TOKEN } : {}),
  });
  const events = new EventService(prisma);
  const rsvps = new RsvpService(prisma);
  const preferences = new PreferenceService(prisma);
  const potluck = new PotluckService(prisma);
  const reminders = new ReminderService(prisma);
  const messages = new SlackMessageService();

  registerLunchCommand(app);
  registerDinnerCommand(app);
  registerPotluckCommand(app);
  registerWeekendRunCommand(app);
  registerMarathonCommand(app);
  registerHyroxCommand(app);
  registerEventSubmissionHandlers(app, events, reminders, messages);
  registerRsvpActions(app, rsvps, events, messages);
  registerPreferenceActions(app, events, preferences, messages);
  registerPotluckActions(app, events, potluck, messages);
  registerOrganizerActions(app, events, reminders, messages);

  app.event("app_uninstalled", async ({ body }) => {
    const teamId = "team_id" in body ? body.team_id : undefined;
    if (typeof teamId === "string") await workspaces.markUninstalled(teamId);
  });

  app.error(async (error) => {
    logger.error("Unhandled Slack listener error", { error: error.message });
  });

  return {
    app,
    receiver,
    logger,
    startJobs: () => startReminderJob(reminders, workspaces, env, logger),
  };
}
