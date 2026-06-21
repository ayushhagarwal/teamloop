import { EventType } from "@prisma/client";
import type { CommandMetadata } from "../types/slack.types.js";
import {
  buildActivityModal,
  callbackIdFor,
  type ActivityModalConfig,
} from "./shared.modal.js";

export const lunchModalConfig: ActivityModalConfig = {
  callbackId: callbackIdFor(EventType.LUNCH),
  title: "Create team lunch",
  defaultTitle: "Team Lunch",
  locationLabel: "Restaurant / location / order link",
  fields: [
    { blockId: "budget", label: "Budget per person", kind: "text", optional: true },
    {
      blockId: "foodPreferencesEnabled",
      label: "Food preference options enabled?",
      kind: "boolean",
      initialValue: "Yes",
    },
  ],
};

export const buildLunchModal = (metadata: CommandMetadata) =>
  buildActivityModal(lunchModalConfig, metadata);
