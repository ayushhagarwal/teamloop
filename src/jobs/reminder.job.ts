import { ReminderType } from "@prisma/client";
import { WebClient } from "@slack/web-api";
import cron, { type ScheduledTask } from "node-cron";
import type { Env } from "../config/env.js";
import type { Logger } from "../config/logger.js";
import { ReminderService } from "../services/reminder.service.js";
import { WorkspaceService } from "../services/workspace.service.js";
import { slackTime } from "../utils/date.js";

export function startReminderJob(
  reminders: ReminderService,
  workspaces: WorkspaceService,
  env: Env,
  logger: Logger,
): ScheduledTask {
  return cron.schedule(
    "* * * * *",
    async () => {
      const due = await reminders.due();
      for (const reminder of due) {
        if (!(await reminders.claim(reminder.id))) continue;
        try {
          const token =
            env.SLACK_BOT_TOKEN ??
            (await workspaces.getBotTokenByWorkspaceId(reminder.event.workspaceId));
          if (!token) throw new Error("No Slack bot token for reminder workspace.");
          const client = new WebClient(token);
          await client.chat.postMessage({
            channel: reminder.event.slackChannelId,
            ...(reminder.event.slackMessageTs
              ? { thread_ts: reminder.event.slackMessageTs }
              : {}),
            text: reminderText(reminder.type, reminder.event),
          });
          await reminders.markSent(reminder.id);
        } catch (error) {
          logger.error("Reminder delivery failed", {
            reminderId: reminder.id,
            eventId: reminder.eventId,
            error: error instanceof Error ? error.message : String(error),
          });
          await reminders.markFailed(reminder.id, error);
        }
      }
    },
    { noOverlap: true },
  );
}

function reminderText(
  type: ReminderType,
  event: { title: string; location: string | null; eventStartsAt: Date },
): string {
  if (type === ReminderType.RSVP_DEADLINE) {
    return `⏰ Reminder: RSVP for *${event.title}* soon.`;
  }
  if (type === ReminderType.EVENT_START) {
    return `📍 *${event.title}* starts ${slackTime(event.eventStartsAt)}${
      event.location ? ` at ${event.location}` : ""
    }. See you there!`;
  }
  return `🔔 Reminder: Please update your RSVP for *${event.title}*.`;
}
