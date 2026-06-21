import type { SlackViewValues } from "../types/slack.types.js";

export function parseActionValue(action: unknown): { eventId: string; value?: string } {
  if (
    !action ||
    typeof action !== "object" ||
    !("value" in action) ||
    typeof action.value !== "string"
  ) {
    throw new Error("Missing action value");
  }
  return JSON.parse(action.value) as { eventId: string; value?: string };
}

export function modalValue(
  values: SlackViewValues,
  blockId: string,
  actionId = "value",
): string {
  const state = values[blockId]?.[actionId];
  if (!state) return "";
  if ("value" in state && typeof state.value === "string") return state.value;
  if (
    "selected_option" in state &&
    state.selected_option &&
    "value" in state.selected_option
  ) {
    return state.selected_option.value;
  }
  if ("selected_date" in state && typeof state.selected_date === "string") {
    return state.selected_date;
  }
  if ("selected_time" in state && typeof state.selected_time === "string") {
    return state.selected_time;
  }
  return "";
}

export function channelIdFromBody(body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    "channel" in body &&
    body.channel &&
    typeof body.channel === "object" &&
    "id" in body.channel &&
    typeof body.channel.id === "string"
  ) {
    return body.channel.id;
  }
  throw new Error("Missing Slack channel");
}
