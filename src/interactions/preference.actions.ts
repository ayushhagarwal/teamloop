import type { App } from "@slack/bolt";
import { buildPreferenceModal } from "../modals/preference.modal.js";
import { EventService } from "../services/event.service.js";
import { PreferenceService } from "../services/preference.service.js";
import { SlackMessageService } from "../services/slack-message.service.js";
import { toUserMessage } from "../utils/errors.js";
import { FIELD_LIMITS } from "../utils/limits.js";
import { modalValue, parseActionValue, signedSlackTeamId } from "./helpers.js";

export function registerPreferenceActions(
  app: App,
  events: EventService,
  preferences: PreferenceService,
  messages: SlackMessageService,
): void {
  app.action("open_preference", async ({ ack, action, body, client, respond }) => {
    await ack();
    try {
      const { eventId } = parseActionValue(action);
      const event = await events.getById(eventId, signedSlackTeamId(body));
      if (!("trigger_id" in body) || typeof body.trigger_id !== "string") {
        throw new Error("Missing trigger ID");
      }
      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildPreferenceModal(event),
      });
    } catch (error) {
      await respond({ response_type: "ephemeral", text: toUserMessage(error) });
    }
  });

  app.view("save_preference", async ({ ack, body, view, client }) => {
    const values = view.state.values;
    const preference = modalValue(values, "preference");
    const targetPace = modalValue(values, "targetPaceNote").trim();
    const metadata = JSON.parse(view.private_metadata) as {
      eventId: string;
      primaryRequired?: boolean;
    };
    const errors: Record<string, string> = {};
    if (metadata.primaryRequired !== false && !preference) {
      errors.preference = "Choose a preference.";
    }
    if (targetPace.length > FIELD_LIMITS.marathonPaceNote) {
      errors.targetPaceNote = `Use ${FIELD_LIMITS.marathonPaceNote} characters or fewer.`;
    }
    if (Object.keys(errors).length) {
      await ack({ response_action: "errors", errors });
      return;
    }
    await ack();
    const { eventId } = metadata;
    const slackTeamId = signedSlackTeamId(body);
    await events.getById(eventId, slackTeamId);
    if (preference) {
      await preferences.upsert(eventId, body.user.id, "primary", preference);
    }
    const plusOne = modalValue(values, "plusOne");
    if (plusOne) {
      await preferences.upsert(eventId, body.user.id, "plusOne", plusOne);
    }
    if (targetPace) {
      await preferences.upsert(eventId, body.user.id, "targetPace", targetPace);
    }
    const event = await events.getById(eventId, slackTeamId);
    await messages.updateEvent(client, event);
    await messages.ephemeral(client, event.slackChannelId, body.user.id, "Saved.");
  });
}
