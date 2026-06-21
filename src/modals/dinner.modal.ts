import { EventType } from "@prisma/client";
import type { CommandMetadata } from "../types/slack.types.js";
import {
  buildActivityModal,
  callbackIdFor,
  type ActivityModalConfig,
} from "./shared.modal.js";

export const dinnerModalConfig: ActivityModalConfig = {
  callbackId: callbackIdFor(EventType.DINNER),
  title: "Create team dinner",
  defaultTitle: "Team Dinner",
  locationLabel: "Venue",
  fields: [
    { blockId: "budget", label: "Budget per person", kind: "text", optional: true },
    {
      blockId: "plusOneAllowed",
      label: "Plus-one allowed?",
      kind: "boolean",
      initialValue: "No",
    },
    {
      blockId: "foodPreferencesEnabled",
      label: "Food preference options enabled?",
      kind: "boolean",
      initialValue: "Yes",
    },
  ],
};

export const buildDinnerModal = (metadata: CommandMetadata) =>
  buildActivityModal(dinnerModalConfig, metadata);
