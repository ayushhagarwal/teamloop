import type { ModalView } from "@slack/types";
import type { EventWithRelations } from "../types/event.types.js";

export function buildPotluckItemModal(event: EventWithRelations): ModalView {
  const metadata = event.metadata as { neededCategories?: string[] };
  const categories = metadata.neededCategories?.length
    ? metadata.neededCategories
    : ["Main dish", "Snacks", "Dessert", "Drinks", "Other"];
  return {
    type: "modal",
    callback_id: "save_potluck_item",
    private_metadata: JSON.stringify({ eventId: event.id }),
    title: { type: "plain_text", text: "Bring something" },
    submit: { type: "plain_text", text: "Add item" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "category",
        label: { type: "plain_text", text: "Category" },
        element: {
          type: "static_select",
          action_id: "value",
          options: categories.slice(0, 100).map((category) => ({
            text: { type: "plain_text", text: category.slice(0, 75) },
            value: category.slice(0, 75),
          })),
        },
      },
      textInput("itemName", "Dish / item name"),
      textInput("servesCount", "Serves how many", true),
      {
        type: "input",
        block_id: "dietaryType",
        optional: true,
        label: { type: "plain_text", text: "Dietary type" },
        element: {
          type: "static_select",
          action_id: "value",
          options: ["Veg", "Non-veg", "Vegan", "Other"].map((value) => ({
            text: { type: "plain_text", text: value },
            value,
          })),
        },
      },
      textInput("itemNotes", "Notes", true),
    ],
  };
}

function textInput(blockId: string, label: string, optional = false) {
  return {
    type: "input" as const,
    block_id: blockId,
    optional,
    label: { type: "plain_text" as const, text: label },
    element: { type: "plain_text_input" as const, action_id: "value" },
  };
}
