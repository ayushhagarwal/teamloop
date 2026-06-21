import { EventStatus, EventType, RsvpStatus, type Preference } from "@prisma/client";
import type { KnownBlock } from "@slack/types";
import type { EventMetadata, EventWithRelations } from "../types/event.types.js";
import { slackDate } from "../utils/date.js";
import { escapeMrkdwn, titleCase, truncate } from "../utils/text.js";
import { button, contextBlock, divider, mrkdwnSection } from "./shared.blocks.js";

const activity: Record<
  EventType,
  { emoji: string; label: string; preferenceLabel: string; preferenceAction: string }
> = {
  LUNCH: {
    emoji: "🍱",
    label: "Lunch",
    preferenceLabel: "Set food preference",
    preferenceAction: "open_preference",
  },
  DINNER: {
    emoji: "🍽️",
    label: "Dinner",
    preferenceLabel: "Set food preference",
    preferenceAction: "open_preference",
  },
  POTLUCK: {
    emoji: "🥘",
    label: "Potluck",
    preferenceLabel: "Bring something",
    preferenceAction: "open_potluck_item",
  },
  WEEKEND_RUN: {
    emoji: "🏃",
    label: "Weekend run",
    preferenceLabel: "Set pace preference",
    preferenceAction: "open_preference",
  },
  MARATHON: {
    emoji: "🏅",
    label: "Marathon",
    preferenceLabel: "Set running preference",
    preferenceAction: "open_preference",
  },
  HYROX: {
    emoji: "🔥",
    label: "HYROX",
    preferenceLabel: "Set HYROX preference",
    preferenceAction: "open_preference",
  },
};

export function renderEventCard(event: EventWithRelations): KnownBlock[] {
  const definition = activity[event.type];
  const metadata = readMetadata(event.metadata);
  const counts = countRsvps(event);
  const value = JSON.stringify({ eventId: event.id });
  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${definition.emoji} ${truncate(event.title, 140)}`,
        emoji: true,
      },
    },
    contextBlock([
      `Created by <@${event.organizerSlackUserId}>`,
      `${definition.label} · *Status: ${statusLabel(event.status)}*`,
    ]),
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*📅 Date & time*\n${slackDate(event.eventStartsAt)}` },
        {
          type: "mrkdwn",
          text: `*📍 Location*\n${escapeMrkdwn(event.location ?? "To be confirmed")}`,
        },
        {
          type: "mrkdwn",
          text: `*⏰ RSVP by*\n${
            event.rsvpDeadlineAt ? slackDate(event.rsvpDeadlineAt) : "No deadline"
          }`,
        },
        {
          type: "mrkdwn",
          text: `*Who’s joining?*\n✅ ${counts.going} · 🤔 ${counts.maybe} · ❌ ${counts.cannot}`,
        },
      ],
    },
  ];

  const detail = activityDetail(event.type, metadata, event.preferences, event);
  if (detail) blocks.push(mrkdwnSection(detail));
  if (event.description) {
    blocks.push(
      mrkdwnSection(`*💬 Notes*\n${escapeMrkdwn(truncate(event.description, 700))}`),
    );
  }

  if (event.status === EventStatus.CANCELLED) {
    blocks.push(divider(), mrkdwnSection("🚫 *This event has been cancelled.*"), {
      type: "actions",
      elements: [button("View summary", "view_summary", value)],
    });
    return blocks;
  }

  if (event.status === EventStatus.RSVP_CLOSED) {
    blocks.push(divider(), mrkdwnSection("🔒 *RSVPs are closed for this event.*"), {
      type: "actions",
      elements: [button("View summary", "view_summary", value)],
    });
  } else {
    blocks.push({
      type: "actions",
      block_id: `rsvp_${event.id}`,
      elements: [
        button("✅ Going", "rsvp_going", value, "primary"),
        button("🤔 Maybe", "rsvp_maybe", value),
        button("❌ Can’t make it", "rsvp_cannot", value),
        ...(showsPreferenceAction(event.type, metadata)
          ? [
              button(
                preferenceActionLabel(event.type, metadata, definition.preferenceLabel),
                definition.preferenceAction,
                value,
              ),
            ]
          : []),
        button("View summary", "view_summary", value),
      ],
    });
  }

  blocks.push(divider(), contextBlock(["Organizer controls"]), {
    type: "actions",
    block_id: `organizer_${event.id}`,
    elements: [
      button("Edit", "edit_event", value),
      button("Send reminder", "send_reminder", value),
      ...(event.status === EventStatus.OPEN
        ? [button("Close RSVP", "close_rsvp", value)]
        : []),
      button("Cancel", "cancel_event", value, "danger", {
        title: "Cancel event?",
        text: "The event card will remain visible and pending reminders will stop.",
        confirm: "Cancel event",
        deny: "Keep event",
      }),
    ],
  });
  return blocks;
}

function countRsvps(event: EventWithRelations) {
  return {
    going: event.rsvps.filter((rsvp) => rsvp.status === RsvpStatus.GOING).length,
    maybe: event.rsvps.filter((rsvp) => rsvp.status === RsvpStatus.MAYBE).length,
    cannot: event.rsvps.filter((rsvp) => rsvp.status === RsvpStatus.CANNOT_MAKE_IT)
      .length,
  };
}

function statusLabel(status: EventStatus): string {
  if (status === EventStatus.RSVP_CLOSED) return "RSVP closed";
  return titleCase(status);
}

function readMetadata(value: unknown): EventMetadata {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as EventMetadata;
  }
  return {};
}

function activityDetail(
  type: EventType,
  metadata: EventMetadata,
  preferences: Preference[],
  event: EventWithRelations,
): string {
  const preferenceSummary = summarizePreferences(preferences);
  switch (type) {
    case EventType.LUNCH:
      return compactLines([
        `*🍴 Lunch details*`,
        metadata.budget ? `Budget: ${escapeMrkdwn(String(metadata.budget))}` : "",
        preferenceSummary,
      ]);
    case EventType.DINNER:
      return compactLines([
        `*🍴 Dinner details*`,
        metadata.budget ? `Budget: ${escapeMrkdwn(String(metadata.budget))}` : "",
        `Plus-one: ${metadata.plusOneAllowed ? "Allowed" : "Not enabled"}`,
        preferenceSummary,
      ]);
    case EventType.POTLUCK: {
      const claimed = event.potluckItems.slice(0, 5).map((item) => {
        const by = item.claimedBySlackUserId
          ? ` by <@${item.claimedBySlackUserId}>`
          : "";
        const detail = [
          item.dietaryType,
          item.servesCount ? `serves ${item.servesCount}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        return `• *${escapeMrkdwn(item.category)}:* ${escapeMrkdwn(item.itemName)}${by}${detail ? ` _(${escapeMrkdwn(detail)})_` : ""}`;
      });
      const needed = Array.isArray(metadata.neededCategories)
        ? metadata.neededCategories.filter(
            (category) =>
              !event.potluckItems.some((item) => item.category === category),
          )
        : [];
      return compactLines([
        "*🥘 Potluck plan*",
        claimed.length ? `*Claimed*\n${claimed.join("\n")}` : "No items claimed yet.",
        needed.length
          ? `*Still needed:* ${needed.map(escapeMrkdwn).join(", ")}`
          : "All requested categories have a contribution.",
        event.potluckItems.length > 5
          ? "_More items are available in the summary._"
          : "",
      ]);
    }
    case EventType.WEEKEND_RUN:
      return compactLines([
        "*🏃 Run details*",
        `Distance: ${display(metadata.distance, "Flexible")} · Pace: ${display(metadata.pace, "Mixed groups")}`,
        `Beginner-friendly: ${yesNo(metadata.beginnerFriendly)}`,
        metadata.routeLink ? `Route: ${display(metadata.routeLink, "")}` : "",
        preferenceSummary,
      ]);
    case EventType.MARATHON:
      return compactLines([
        "*🏅 Marathon plan*",
        metadata.raceName ? `Race: ${escapeMrkdwn(String(metadata.raceName))}` : "",
        `Distance: ${display(metadata.distance, "Flexible")}${
          metadata.targetPace
            ? ` · Target pace: ${display(metadata.targetPace, "")}`
            : ""
        }`,
        `Beginner group: ${yesNo(metadata.beginnerFriendly)}`,
        preferenceSummary,
      ]);
    case EventType.HYROX:
      return compactLines([
        "*🔥 HYROX details*",
        `Workout: ${display(metadata.workoutType, "Full prep")} · Intensity: ${display(metadata.intensity, "Mixed")}`,
        `Partner needed: ${yesNo(metadata.partnerNeeded)} · Beginner-friendly: ${yesNo(metadata.beginnerFriendly)}`,
        preferenceSummary,
      ]);
  }
}

function summarizePreferences(preferences: Preference[]): string {
  if (!preferences.length) return "";
  const counts = new Map<string, number>();
  for (const preference of preferences) {
    const label =
      preference.key === "plusOne"
        ? `Plus-one ${preference.value}`
        : preference.key === "targetPace"
          ? `Pace ${preference.value}`
          : preference.value;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const summary = [...counts.entries()]
    .slice(0, 4)
    .map(([value, count]) => `${escapeMrkdwn(value)} ${count}`)
    .join(" · ");
  return summary ? `*Preferences:* ${summary}` : "";
}

function compactLines(lines: string[]): string {
  return lines.filter(Boolean).join("\n");
}

function yesNo(value: EventMetadata[string] | undefined): string {
  return value === true || value === "Yes" ? "Yes" : "No";
}

function display(value: EventMetadata[string] | undefined, fallback: string): string {
  if (value === undefined || value === null || value === "") return fallback;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function showsPreferenceAction(type: EventType, metadata: EventMetadata): boolean {
  if (type === EventType.LUNCH) return metadata.foodPreferencesEnabled !== false;
  if (type === EventType.DINNER) {
    return (
      metadata.foodPreferencesEnabled !== false || metadata.plusOneAllowed === true
    );
  }
  return true;
}

function preferenceActionLabel(
  type: EventType,
  metadata: EventMetadata,
  fallback: string,
): string {
  if (
    type === EventType.DINNER &&
    metadata.foodPreferencesEnabled === false &&
    metadata.plusOneAllowed === true
  ) {
    return "Set plus-one";
  }
  return fallback;
}
