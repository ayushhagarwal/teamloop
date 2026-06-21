import { EventType } from "@prisma/client";
import type { CommandMetadata } from "../types/slack.types.js";
import {
  buildActivityModal,
  callbackIdFor,
  type ActivityModalConfig,
} from "./shared.modal.js";

export const potluckModalConfig: ActivityModalConfig = {
  callbackId: callbackIdFor(EventType.POTLUCK),
  title: "Create team potluck",
  defaultTitle: "Team Potluck",
  locationLabel: "Venue",
  fields: [
    {
      blockId: "neededCategories",
      label: "Needed categories",
      kind: "text",
      initialValue: "Main dish, Snacks, Dessert, Drinks",
      placeholder: "Comma-separated categories",
    },
  ],
};

export const buildPotluckModal = (metadata: CommandMetadata) =>
  buildActivityModal(potluckModalConfig, metadata);
