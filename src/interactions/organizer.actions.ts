import { ReminderType } from "@prisma/client";
import type { App } from "@slack/bolt";
import { renderSummary } from "../blocks/summary.blocks.js";
import { buildEditEventModal } from "../modals/edit-event.modal.js";
import { EventService } from "../services/event.service.js";
import { PermissionService } from "../services/permission.service.js";
import { ReminderService } from "../services/reminder.service.js";
import { SlackMessageService } from "../services/slack-message.service.js";
import { slackTime } from "../utils/date.js";
import { toUserMessage } from "../utils/errors.js";
import { eventInputSchema, formatZodErrors } from "../utils/validation.js";
import { extractActivityValues } from "../modals/shared.modal.js";
import { parseActionValue } from "./helpers.js";

export function registerOrganizerActions(
  app: App,
  events: EventService,
  reminders: ReminderService,
  messages: SlackMessageService,
): void {
  const permissions = new PermissionService();

  app.action("view_summary", async ({ ack, action, body, client, respond }) => {
    await ack();
    try {
      const event = await events.getById(parseActionValue(action).eventId);
      await client.chat.postEphemeral({
        channel: event.slackChannelId,
        user: body.user.id,
        text: `Summary for ${event.title}`,
        blocks: renderSummary(event),
      });
    } catch (error) {
      await respond({ response_type: "ephemeral", text: toUserMessage(error) });
    }
  });

  app.action("edit_event", async ({ ack, action, body, client, respond }) => {
    await ack();
    try {
      const event = await events.getById(parseActionValue(action).eventId);
      permissions.assertOrganizer(event, body.user.id);
      if (!("trigger_id" in body) || typeof body.trigger_id !== "string") {
        throw new Error("Missing trigger ID");
      }
      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildEditEventModal(event),
      });
    } catch (error) {
      await respond({ response_type: "ephemeral", text: toUserMessage(error) });
    }
  });

  app.view("edit_event_submission", async ({ ack, body, view, client }) => {
    const raw = extractActivityValues(view.state.values, []);
    const parsed = eventInputSchema.safeParse(raw);
    if (!parsed.success) {
      await ack({
        response_action: "errors",
        errors: formatZodErrors(parsed.error),
      });
      return;
    }
    await ack();
    const { eventId } = JSON.parse(view.private_metadata) as { eventId: string };
    const event = await events.update(eventId, body.user.id, {
      title: parsed.data.title,
      location: parsed.data.location,
      description: parsed.data.notes || null,
      eventStartsAt: parsed.data.eventStartsAt,
      rsvpDeadlineAt: parsed.data.rsvpDeadlineAt,
    });
    await messages.updateEvent(client, event);
  });

  app.action("close_rsvp", async ({ ack, action, body, client, respond }) => {
    await ack();
    try {
      const event = await events.closeRsvp(
        parseActionValue(action).eventId,
        body.user.id,
      );
      await messages.updateEvent(client, event);
      await respond({ response_type: "ephemeral", text: "RSVPs are now closed." });
    } catch (error) {
      await respond({ response_type: "ephemeral", text: toUserMessage(error) });
    }
  });

  app.action("cancel_event", async ({ ack, action, body, client, respond }) => {
    await ack();
    try {
      const event = await events.cancel(parseActionValue(action).eventId, body.user.id);
      await messages.updateEvent(client, event);
      await respond({
        response_type: "ephemeral",
        text: "The event has been cancelled.",
      });
    } catch (error) {
      await respond({ response_type: "ephemeral", text: toUserMessage(error) });
    }
  });

  app.action("send_reminder", async ({ ack, action, body, client, respond }) => {
    await ack();
    try {
      const event = await events.getById(parseActionValue(action).eventId);
      permissions.assertOrganizer(event, body.user.id);
      const reminder = await reminders.createManual(event.id);
      try {
        await client.chat.postMessage({
          channel: event.slackChannelId,
          ...(event.slackMessageTs ? { thread_ts: event.slackMessageTs } : {}),
          text: `🔔 Reminder from <@${body.user.id}>: Please update your RSVP for *${event.title}*. The event starts ${slackTime(event.eventStartsAt)}.`,
        });
        await reminders.markSent(reminder.id);
      } catch (error) {
        await reminders.markFailed(reminder.id, error);
        throw error;
      }
      await respond({ response_type: "ephemeral", text: "Reminder sent." });
    } catch (error) {
      await respond({ response_type: "ephemeral", text: toUserMessage(error) });
    }
  });
}

export function reminderLabel(type: ReminderType): string {
  if (type === ReminderType.RSVP_DEADLINE) return "RSVP deadline";
  if (type === ReminderType.EVENT_START) return "Event start";
  return "Manual";
}
