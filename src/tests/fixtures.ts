import { EventStatus, EventType } from "@prisma/client";
import type { EventWithRelations } from "../types/event.types.js";

export function eventFixture(
  overrides: Partial<EventWithRelations> = {},
): EventWithRelations {
  const base: EventWithRelations = {
    id: "event_1",
    workspaceId: "workspace_1",
    channelId: "channel_1",
    organizerSlackUserId: "U_ORGANIZER",
    type: EventType.LUNCH,
    title: "Team Lunch",
    description: "Meet in the lobby.",
    location: "Green Cafe",
    eventStartsAt: new Date("2030-06-22T12:30:00.000Z"),
    rsvpDeadlineAt: new Date("2030-06-22T10:00:00.000Z"),
    status: EventStatus.OPEN,
    slackMessageTs: "123.456",
    slackChannelId: "C_TEAM",
    metadata: { budget: "$15", foodPreferencesEnabled: true },
    createdAt: new Date("2030-06-20T00:00:00.000Z"),
    updatedAt: new Date("2030-06-20T00:00:00.000Z"),
    cancelledAt: null,
    closedAt: null,
    rsvps: [],
    preferences: [],
    potluckItems: [],
  };
  return { ...base, ...overrides };
}
