import type { ModalView } from "@slack/types";
import type { EventWithRelations } from "../types/event.types.js";

export function buildEditEventModal(event: EventWithRelations): ModalView {
  return {
    type: "modal",
    callback_id: "edit_event_submission",
    private_metadata: JSON.stringify({ eventId: event.id }),
    title: { type: "plain_text", text: "Edit event" },
    submit: { type: "plain_text", text: "Save changes" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      textInput("title", "Activity title", event.title),
      {
        type: "input",
        block_id: "date",
        label: { type: "plain_text", text: "Date" },
        element: {
          type: "datepicker",
          action_id: "value",
          initial_date: event.eventStartsAt.toISOString().slice(0, 10),
        },
      },
      {
        type: "input",
        block_id: "time",
        label: { type: "plain_text", text: "Time (UTC)" },
        element: {
          type: "timepicker",
          action_id: "value",
          initial_time: event.eventStartsAt.toISOString().slice(11, 16),
        },
      },
      textInput("location", "Location / meeting point", event.location ?? ""),
      {
        type: "input",
        block_id: "rsvpDeadlineDate",
        label: { type: "plain_text", text: "RSVP deadline date" },
        element: {
          type: "datepicker",
          action_id: "value",
          initial_date: (event.rsvpDeadlineAt ?? event.eventStartsAt)
            .toISOString()
            .slice(0, 10),
        },
      },
      {
        type: "input",
        block_id: "rsvpDeadlineTime",
        label: { type: "plain_text", text: "RSVP deadline time (UTC)" },
        element: {
          type: "timepicker",
          action_id: "value",
          initial_time: (event.rsvpDeadlineAt ?? event.eventStartsAt)
            .toISOString()
            .slice(11, 16),
        },
      },
      textInput("notes", "Notes", event.description ?? "", true, true),
    ],
  };
}

function textInput(
  blockId: string,
  label: string,
  initialValue: string,
  optional = false,
  multiline = false,
) {
  return {
    type: "input" as const,
    block_id: blockId,
    optional,
    label: { type: "plain_text" as const, text: label },
    element: {
      type: "plain_text_input" as const,
      action_id: "value",
      initial_value: initialValue,
      multiline,
    },
  };
}
