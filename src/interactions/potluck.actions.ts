import type { App } from "@slack/bolt";
import { buildPotluckItemModal } from "../modals/potluck-item.modal.js";
import { EventService } from "../services/event.service.js";
import { PotluckService } from "../services/potluck.service.js";
import { SlackMessageService } from "../services/slack-message.service.js";
import { toUserMessage } from "../utils/errors.js";
import { modalValue, parseActionValue } from "./helpers.js";

export function registerPotluckActions(
  app: App,
  events: EventService,
  potluck: PotluckService,
  messages: SlackMessageService,
): void {
  app.action("open_potluck_item", async ({ ack, action, body, client, respond }) => {
    await ack();
    try {
      const { eventId } = parseActionValue(action);
      const event = await events.getById(eventId);
      if (!("trigger_id" in body) || typeof body.trigger_id !== "string") {
        throw new Error("Missing trigger ID");
      }
      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildPotluckItemModal(event),
      });
    } catch (error) {
      await respond({ response_type: "ephemeral", text: toUserMessage(error) });
    }
  });

  app.view("save_potluck_item", async ({ ack, body, view, client }) => {
    const values = view.state.values;
    const itemName = modalValue(values, "itemName").trim();
    const servesRaw = modalValue(values, "servesCount").trim();
    const servesCount = servesRaw ? Number.parseInt(servesRaw, 10) : undefined;
    const errors: Record<string, string> = {};
    if (!itemName) errors.itemName = "Enter a dish or item name.";
    if (servesRaw && (!servesCount || servesCount < 1 || servesCount > 10_000)) {
      errors.servesCount = "Enter a positive number.";
    }
    if (Object.keys(errors).length) {
      await ack({ response_action: "errors", errors });
      return;
    }
    await ack();
    const { eventId } = JSON.parse(view.private_metadata) as { eventId: string };
    await potluck.addItem(eventId, body.user.id, {
      category: modalValue(values, "category"),
      itemName,
      ...(servesCount ? { servesCount } : {}),
      ...(modalValue(values, "dietaryType")
        ? { dietaryType: modalValue(values, "dietaryType") }
        : {}),
      ...(modalValue(values, "itemNotes")
        ? { notes: modalValue(values, "itemNotes") }
        : {}),
    });
    const event = await events.getById(eventId);
    await messages.updateEvent(client, event);
    await messages.ephemeral(
      client,
      event.slackChannelId,
      body.user.id,
      "Added your potluck item.",
    );
  });
}
