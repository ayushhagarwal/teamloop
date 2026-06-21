import type { WebClient } from "@slack/web-api";
import { renderEventCard } from "../blocks/event-card.blocks.js";
import type { EventWithRelations } from "../types/event.types.js";

export class SlackMessageService {
  async postEvent(client: WebClient, event: EventWithRelations) {
    return client.chat.postMessage({
      channel: event.slackChannelId,
      text: `${event.title} — TeamLoop event`,
      blocks: renderEventCard(event),
      unfurl_links: false,
      unfurl_media: false,
    });
  }

  async updateEvent(client: WebClient, event: EventWithRelations): Promise<void> {
    if (!event.slackMessageTs) return;
    await client.chat.update({
      channel: event.slackChannelId,
      ts: event.slackMessageTs,
      text: `${event.title} — TeamLoop event`,
      blocks: renderEventCard(event),
    });
  }

  async ephemeral(
    client: WebClient,
    channel: string,
    user: string,
    text: string,
  ): Promise<void> {
    await client.chat.postEphemeral({ channel, user, text });
  }
}
