import type { ViewStateValue } from "@slack/bolt";

export interface CommandMetadata {
  channelId: string;
  channelName?: string;
  userId: string;
  teamId: string;
  teamName?: string;
  eventType: string;
}

export type SlackViewValues = Record<string, Record<string, ViewStateValue>>;

export interface EventActionValue {
  eventId: string;
  value?: string;
}
