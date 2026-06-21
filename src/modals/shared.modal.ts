import type { EventType } from "@prisma/client";
import type { InputBlockElement, ModalView, KnownBlock } from "@slack/types";
import type { CommandMetadata, SlackViewValues } from "../types/slack.types.js";

export interface ModalField {
  blockId: string;
  actionId?: string;
  label: string;
  kind: "text" | "select" | "boolean";
  optional?: boolean;
  multiline?: boolean;
  placeholder?: string;
  initialValue?: string;
  options?: string[];
}

export interface ActivityModalConfig {
  callbackId: string;
  title: string;
  defaultTitle: string;
  locationLabel: string;
  fields: ModalField[];
}

export function buildActivityModal(
  config: ActivityModalConfig,
  metadata: CommandMetadata,
): ModalView {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const blocks: KnownBlock[] = [
    input("title", "Activity title", {
      type: "plain_text_input",
      action_id: "value",
      initial_value: config.defaultTitle,
      max_length: 150,
    }),
    input("date", "Date", {
      type: "datepicker",
      action_id: "value",
      initial_date: tomorrow,
      placeholder: { type: "plain_text", text: "Select a date" },
    }),
    input("time", "Time (UTC)", {
      type: "timepicker",
      action_id: "value",
      initial_time: "12:30",
      placeholder: { type: "plain_text", text: "Select a time" },
    }),
    input("location", config.locationLabel, {
      type: "plain_text_input",
      action_id: "value",
      max_length: 300,
      placeholder: { type: "plain_text", text: "Where should everyone meet?" },
    }),
    ...config.fields.map(renderField),
    input("rsvpDeadlineDate", "RSVP deadline date", {
      type: "datepicker",
      action_id: "value",
      initial_date: tomorrow,
      placeholder: { type: "plain_text", text: "Select a date" },
    }),
    input("rsvpDeadlineTime", "RSVP deadline time (UTC)", {
      type: "timepicker",
      action_id: "value",
      initial_time: "10:00",
      placeholder: { type: "plain_text", text: "Select a time" },
    }),
    input(
      "reminderMinutes",
      "Event reminder",
      {
        type: "static_select",
        action_id: "value",
        initial_option: option("60 minutes before", "60"),
        options: [
          option("No event reminder", "0"),
          option("30 minutes before", "30"),
          option("60 minutes before", "60"),
          option("1 day before", "1440"),
        ],
      },
      true,
    ),
    input(
      "notes",
      "Notes",
      {
        type: "plain_text_input",
        action_id: "value",
        multiline: true,
        max_length: 1500,
        placeholder: {
          type: "plain_text",
          text: "Anything else the team should know?",
        },
      },
      true,
    ),
  ];

  return {
    type: "modal",
    callback_id: config.callbackId,
    private_metadata: JSON.stringify(metadata),
    title: { type: "plain_text", text: config.title.slice(0, 24) },
    submit: { type: "plain_text", text: "Create event" },
    close: { type: "plain_text", text: "Cancel" },
    notify_on_close: false,
    blocks,
  };
}

export function extractActivityValues(
  values: SlackViewValues,
  extraFields: ModalField[],
): Record<string, string> {
  const result: Record<string, string> = {
    title: readValue(values, "title"),
    date: readValue(values, "date"),
    time: readValue(values, "time"),
    location: readValue(values, "location"),
    rsvpDeadlineDate: readValue(values, "rsvpDeadlineDate"),
    rsvpDeadlineTime: readValue(values, "rsvpDeadlineTime"),
    reminderMinutes: readValue(values, "reminderMinutes"),
    notes: readValue(values, "notes"),
  };
  for (const field of extraFields) {
    result[field.blockId] = readValue(values, field.blockId, field.actionId ?? "value");
  }
  return result;
}

export function callbackIdFor(type: EventType): string {
  return `create_${type.toLowerCase()}_event`;
}

function renderField(field: ModalField): KnownBlock {
  if (field.kind === "select" || field.kind === "boolean") {
    const options = field.kind === "boolean" ? ["Yes", "No"] : (field.options ?? []);
    const initialValue = field.initialValue ?? options[0] ?? "";
    return input(
      field.blockId,
      field.label,
      {
        type: "static_select",
        action_id: field.actionId ?? "value",
        placeholder: {
          type: "plain_text",
          text: field.placeholder ?? "Choose an option",
        },
        options: options.map((value) => option(value, value)),
        ...(initialValue ? { initial_option: option(initialValue, initialValue) } : {}),
      },
      field.optional,
    );
  }

  return input(
    field.blockId,
    field.label,
    {
      type: "plain_text_input",
      action_id: field.actionId ?? "value",
      ...(field.initialValue ? { initial_value: field.initialValue } : {}),
      ...(field.multiline ? { multiline: true } : {}),
      placeholder: {
        type: "plain_text",
        text: field.placeholder ?? `Enter ${field.label.toLowerCase()}`,
      },
    },
    field.optional,
  );
}

function input(
  blockId: string,
  label: string,
  element: InputBlockElement,
  optional = false,
): KnownBlock {
  return {
    type: "input",
    block_id: blockId,
    optional,
    label: { type: "plain_text", text: label, emoji: true },
    element,
  };
}

function option(text: string, value: string) {
  return {
    text: { type: "plain_text" as const, text, emoji: true },
    value,
  };
}

function readValue(
  values: SlackViewValues,
  blockId: string,
  actionId = "value",
): string {
  const state = values[blockId]?.[actionId];
  if (!state) return "";
  if ("value" in state && typeof state.value === "string") return state.value;
  if ("selected_date" in state && typeof state.selected_date === "string") {
    return state.selected_date;
  }
  if ("selected_time" in state && typeof state.selected_time === "string") {
    return state.selected_time;
  }
  if (
    "selected_option" in state &&
    state.selected_option &&
    "value" in state.selected_option
  ) {
    return state.selected_option.value;
  }
  return "";
}
