import { EventType } from "@prisma/client";
import type { App } from "@slack/bolt";
import { dinnerModalConfig } from "../modals/dinner.modal.js";
import { hyroxModalConfig } from "../modals/hyrox.modal.js";
import { lunchModalConfig } from "../modals/lunch.modal.js";
import { marathonModalConfig } from "../modals/marathon.modal.js";
import { potluckModalConfig } from "../modals/potluck.modal.js";
import {
  extractActivityValues,
  type ActivityModalConfig,
} from "../modals/shared.modal.js";
import { weekendRunModalConfig } from "../modals/weekendrun.modal.js";
import { EventService } from "../services/event.service.js";
import { ReminderService } from "../services/reminder.service.js";
import { SlackMessageService } from "../services/slack-message.service.js";
import type { EventMetadata } from "../types/event.types.js";
import type { CommandMetadata } from "../types/slack.types.js";
import {
  eventInputSchema,
  formatZodErrors,
  type ValidatedEventInput,
} from "../utils/validation.js";

const configs: Array<{ type: EventType; config: ActivityModalConfig }> = [
  { type: EventType.LUNCH, config: lunchModalConfig },
  { type: EventType.DINNER, config: dinnerModalConfig },
  { type: EventType.POTLUCK, config: potluckModalConfig },
  { type: EventType.WEEKEND_RUN, config: weekendRunModalConfig },
  { type: EventType.MARATHON, config: marathonModalConfig },
  { type: EventType.HYROX, config: hyroxModalConfig },
];

export function registerEventSubmissionHandlers(
  app: App,
  eventService: EventService,
  reminderService: ReminderService,
  messages: SlackMessageService,
): void {
  for (const { type, config } of configs) {
    app.view(config.callbackId, async ({ ack, body, view, client, logger }) => {
      const raw = extractActivityValues(view.state.values, config.fields);
      const parsed = eventInputSchema.safeParse(raw);
      const customErrors = activityErrors(type, raw);
      if (!parsed.success || Object.keys(customErrors).length) {
        await ack({
          response_action: "errors",
          errors: {
            ...(parsed.success ? {} : formatZodErrors(parsed.error)),
            ...customErrors,
          },
        });
        return;
      }

      await ack();
      try {
        const command = JSON.parse(view.private_metadata) as CommandMetadata;
        const event = await eventService.create({
          slackTeamId: command.teamId,
          ...(command.teamName ? { slackTeamName: command.teamName } : {}),
          slackChannelId: command.channelId,
          ...(command.channelName ? { slackChannelName: command.channelName } : {}),
          organizerSlackUserId: body.user.id,
          type,
          title: parsed.data.title,
          ...(parsed.data.notes ? { description: parsed.data.notes } : {}),
          location: parsed.data.location,
          eventStartsAt: parsed.data.eventStartsAt,
          rsvpDeadlineAt: parsed.data.rsvpDeadlineAt,
          metadata: buildMetadata(type, raw),
        });
        const posted = await messages.postEvent(client, event);
        if (!posted.ts) throw new Error("Slack did not return a message timestamp.");
        await eventService.setSlackMessage(event.id, command.channelId, posted.ts);
        try {
          await reminderService.createDefaults({
            eventId: event.id,
            eventStartsAt: event.eventStartsAt,
            ...(event.rsvpDeadlineAt ? { rsvpDeadlineAt: event.rsvpDeadlineAt } : {}),
            ...(parsed.data.reminderMinutes !== undefined
              ? { eventReminderMinutes: parsed.data.reminderMinutes }
              : {}),
          });
        } catch (error) {
          logger.warn("Event created, but default reminders could not be scheduled", {
            eventId: event.id,
            error,
          });
        }
      } catch (error) {
        logger.error("Failed to create TeamLoop event", error);
        const metadata = JSON.parse(view.private_metadata) as CommandMetadata;
        await messages.ephemeral(
          client,
          metadata.channelId,
          body.user.id,
          "Something went wrong while creating the event. Please try again.",
        );
      }
    });
  }
}

function activityErrors(
  type: EventType,
  raw: Record<string, string>,
): Record<string, string> {
  if (
    (type === EventType.WEEKEND_RUN || type === EventType.MARATHON) &&
    raw.distance === "Custom" &&
    !raw.customDistance?.trim()
  ) {
    return { customDistance: "Enter a custom distance." };
  }
  return {};
}

function buildMetadata(type: EventType, raw: Record<string, string>): EventMetadata {
  const value = (key: string) => raw[key]?.trim() ?? "";
  const yes = (key: string) => value(key) === "Yes";
  switch (type) {
    case EventType.LUNCH:
      return {
        budget: value("budget"),
        foodPreferencesEnabled: yes("foodPreferencesEnabled"),
      };
    case EventType.DINNER:
      return {
        budget: value("budget"),
        plusOneAllowed: yes("plusOneAllowed"),
        foodPreferencesEnabled: yes("foodPreferencesEnabled"),
      };
    case EventType.POTLUCK:
      return {
        neededCategories: value("neededCategories")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };
    case EventType.WEEKEND_RUN:
      return {
        distance:
          value("distance") === "Custom" ? value("customDistance") : value("distance"),
        pace: value("pace"),
        routeLink: value("routeLink"),
        beginnerFriendly: yes("beginnerFriendly"),
      };
    case EventType.MARATHON:
      return {
        raceName: value("raceName"),
        raceDate: value("raceDate"),
        distance:
          value("distance") === "Custom" ? value("customDistance") : value("distance"),
        targetPace: value("targetPace"),
        beginnerFriendly: yes("beginnerFriendly"),
      };
    case EventType.HYROX:
      return {
        workoutType: value("workoutType"),
        partnerNeeded: yes("partnerNeeded"),
        beginnerFriendly: yes("beginnerFriendly"),
        intensity: value("intensity"),
      };
  }
}

export function validatedInputForTest(
  input: Record<string, string>,
): ValidatedEventInput {
  return eventInputSchema.parse(input);
}
