import type { KnownBlock } from "@slack/types";

export function divider(): KnownBlock {
  return { type: "divider" };
}

export function mrkdwnSection(text: string): KnownBlock {
  return {
    type: "section",
    text: { type: "mrkdwn", text },
  };
}

export function contextBlock(elements: string[]): KnownBlock {
  return {
    type: "context",
    elements: elements.map((text) => ({ type: "mrkdwn", text })),
  };
}

export function button(
  text: string,
  actionId: string,
  value: string,
  style?: "primary" | "danger",
  confirm?: {
    title: string;
    text: string;
    confirm: string;
    deny: string;
  },
) {
  return {
    type: "button" as const,
    text: { type: "plain_text" as const, text, emoji: true },
    action_id: actionId,
    value,
    ...(style ? { style } : {}),
    ...(confirm
      ? {
          confirm: {
            title: { type: "plain_text" as const, text: confirm.title },
            text: { type: "mrkdwn" as const, text: confirm.text },
            confirm: { type: "plain_text" as const, text: confirm.confirm },
            deny: { type: "plain_text" as const, text: confirm.deny },
          },
        }
      : {}),
  };
}
