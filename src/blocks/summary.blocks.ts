import { RsvpStatus } from "@prisma/client";
import type { KnownBlock } from "@slack/types";
import type { EventWithRelations } from "../types/event.types.js";
import { escapeMrkdwn } from "../utils/text.js";
import { divider, mrkdwnSection } from "./shared.blocks.js";

export function renderSummary(event: EventWithRelations): KnownBlock[] {
  const byStatus = (status: RsvpStatus) =>
    event.rsvps
      .filter((rsvp) => rsvp.status === status)
      .map((rsvp) => `<@${rsvp.slackUserId}>`);
  const going = byStatus(RsvpStatus.GOING);
  const maybe = byStatus(RsvpStatus.MAYBE);
  const cannot = byStatus(RsvpStatus.CANNOT_MAKE_IT);

  const preferenceRows = event.preferences.map(
    (preference) =>
      `• <@${preference.slackUserId}> — ${
        preference.key === "primary"
          ? escapeMrkdwn(preference.value)
          : `${escapeMrkdwn(preference.key)}: ${escapeMrkdwn(preference.value)}`
      }`,
  );
  const potluckRows = event.potluckItems.map((item) => {
    const owner = item.claimedBySlackUserId
      ? `<@${item.claimedBySlackUserId}>`
      : "Unclaimed";
    return `• *${escapeMrkdwn(item.category)}:* ${escapeMrkdwn(item.itemName)} — ${owner}`;
  });

  return [
    {
      type: "header",
      text: { type: "plain_text", text: `Event summary · ${event.title}`, emoji: true },
    },
    mrkdwnSection(
      [
        `*✅ Going (${going.length})*\n${going.join(", ") || "No responses"}`,
        `*🤔 Maybe (${maybe.length})*\n${maybe.join(", ") || "No responses"}`,
        `*❌ Can’t make it (${cannot.length})*\n${cannot.join(", ") || "No responses"}`,
      ].join("\n\n"),
    ),
    ...(preferenceRows.length
      ? [divider(), mrkdwnSection(`*Preferences*\n${preferenceRows.join("\n")}`)]
      : []),
    ...(potluckRows.length
      ? [divider(), mrkdwnSection(`*Potluck items*\n${potluckRows.join("\n")}`)]
      : []),
  ];
}
