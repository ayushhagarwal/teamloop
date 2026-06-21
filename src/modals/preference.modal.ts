import { EventType } from "@prisma/client";
import type { ModalView } from "@slack/types";
import type { EventWithRelations } from "../types/event.types.js";

const options: Record<EventType, string[]> = {
  LUNCH: ["Veg", "Non-veg", "Vegan", "No preference"],
  DINNER: ["Veg", "Non-veg", "Vegan", "No preference"],
  POTLUCK: [],
  WEEKEND_RUN: ["Easy pace", "Moderate pace", "Fast pace", "Beginner group"],
  MARATHON: ["Joining training", "Running race", "Beginner group"],
  HYROX: ["Need partner", "Beginner", "Competitive", "Casual"],
};

export function buildPreferenceModal(event: EventWithRelations): ModalView {
  const metadata = event.metadata as {
    plusOneAllowed?: boolean;
    foodPreferencesEnabled?: boolean;
  };
  const primaryRequired = !(
    event.type === EventType.DINNER && metadata.foodPreferencesEnabled === false
  );
  return {
    type: "modal",
    callback_id: "save_preference",
    private_metadata: JSON.stringify({ eventId: event.id, primaryRequired }),
    title: { type: "plain_text", text: "Set preference" },
    submit: { type: "plain_text", text: "Save" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      ...(primaryRequired
        ? [
            {
              type: "input" as const,
              block_id: "preference",
              label: { type: "plain_text" as const, text: "Preference" },
              element: {
                type: "static_select" as const,
                action_id: "value",
                placeholder: {
                  type: "plain_text" as const,
                  text: "Choose a preference",
                },
                options: options[event.type].map((value) => ({
                  text: { type: "plain_text" as const, text: value },
                  value,
                })),
              },
            },
          ]
        : []),
      ...(event.type === EventType.DINNER && metadata.plusOneAllowed
        ? [
            {
              type: "input" as const,
              block_id: "plusOne",
              label: { type: "plain_text" as const, text: "Bringing a plus-one?" },
              element: {
                type: "static_select" as const,
                action_id: "value",
                initial_option: selectOption("No"),
                options: [selectOption("Yes"), selectOption("No")],
              },
            },
          ]
        : []),
      ...(event.type === EventType.MARATHON
        ? [
            {
              type: "input" as const,
              block_id: "targetPaceNote",
              optional: true,
              label: { type: "plain_text" as const, text: "Target pace note" },
              element: {
                type: "plain_text_input" as const,
                action_id: "value",
                placeholder: {
                  type: "plain_text" as const,
                  text: "Optional, e.g. 5:45/km",
                },
              },
            },
          ]
        : []),
    ],
  };
}

function selectOption(value: string) {
  return {
    text: { type: "plain_text" as const, text: value },
    value,
  };
}
