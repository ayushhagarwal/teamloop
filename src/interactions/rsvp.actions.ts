import { RsvpStatus } from "@prisma/client";
import type { App } from "@slack/bolt";
import { EventService } from "../services/event.service.js";
import { RsvpService } from "../services/rsvp.service.js";
import { SlackMessageService } from "../services/slack-message.service.js";
import { toUserMessage } from "../utils/errors.js";
import { parseActionValue } from "./helpers.js";

const actions = [
  {
    actionId: "rsvp_going",
    status: RsvpStatus.GOING,
    confirmation: "You’re marked as going.",
  },
  {
    actionId: "rsvp_maybe",
    status: RsvpStatus.MAYBE,
    confirmation: "You’re marked as maybe.",
  },
  {
    actionId: "rsvp_cannot",
    status: RsvpStatus.CANNOT_MAKE_IT,
    confirmation: "You’re marked as unable to make it.",
  },
] as const;

export function registerRsvpActions(
  app: App,
  rsvpService: RsvpService,
  eventService: EventService,
  messages: SlackMessageService,
): void {
  for (const definition of actions) {
    app.action(definition.actionId, async ({ ack, action, body, client, respond }) => {
      await ack();
      try {
        const { eventId } = parseActionValue(action);
        await rsvpService.upsert(eventId, body.user.id, definition.status);
        const event = await eventService.getById(eventId);
        await messages.updateEvent(client, event);
        await respond({ response_type: "ephemeral", text: definition.confirmation });
      } catch (error) {
        await respond({ response_type: "ephemeral", text: toUserMessage(error) });
      }
    });
  }
}
