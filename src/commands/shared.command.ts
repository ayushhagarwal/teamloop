import type { App } from "@slack/bolt";
import type { EventType } from "@prisma/client";
import type { ModalView } from "@slack/types";
import type { CommandMetadata } from "../types/slack.types.js";

type ModalBuilder = (metadata: CommandMetadata) => ModalView;

export function registerActivityCommand(
  app: App,
  command: string,
  eventType: EventType,
  buildModal: ModalBuilder,
): void {
  app.command(command, async ({ ack, body, client }) => {
    await ack();
    const metadata: CommandMetadata = {
      channelId: body.channel_id,
      channelName: body.channel_name,
      userId: body.user_id,
      teamId: body.team_id,
      teamName: body.team_domain,
      eventType,
    };
    await client.views.open({
      trigger_id: body.trigger_id,
      view: buildModal(metadata),
    });
  });
}
