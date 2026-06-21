import type { Event, EventType, PotluckItem, Preference, RSVP } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type EventMetadata = Record<string, string | number | boolean | string[] | null>;

export interface CreateEventInput {
  slackTeamId: string;
  slackTeamName?: string;
  slackChannelId: string;
  slackChannelName?: string;
  organizerSlackUserId: string;
  type: EventType;
  title: string;
  description?: string;
  location: string;
  eventStartsAt: Date;
  rsvpDeadlineAt?: Date;
  metadata?: EventMetadata;
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  location?: string;
  eventStartsAt?: Date;
  rsvpDeadlineAt?: Date | null;
  metadata?: EventMetadata;
}

export type EventWithRelations = Event & {
  rsvps: RSVP[];
  preferences: Preference[];
  potluckItems: PotluckItem[];
};

export function metadataToJson(metadata: EventMetadata): Prisma.InputJsonValue {
  return metadata;
}
