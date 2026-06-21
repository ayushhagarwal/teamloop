import { EventType } from "@prisma/client";
import type { CommandMetadata } from "../types/slack.types.js";
import {
  buildActivityModal,
  callbackIdFor,
  type ActivityModalConfig,
} from "./shared.modal.js";

export const hyroxModalConfig: ActivityModalConfig = {
  callbackId: callbackIdFor(EventType.HYROX),
  title: "Create HYROX session",
  defaultTitle: "HYROX Session",
  locationLabel: "Gym / location",
  fields: [
    {
      blockId: "workoutType",
      label: "Workout type",
      kind: "select",
      options: ["Simulation", "Running", "Strength", "Full prep", "Custom"],
      initialValue: "Full prep",
    },
    {
      blockId: "partnerNeeded",
      label: "Partner needed?",
      kind: "boolean",
      initialValue: "No",
    },
    {
      blockId: "beginnerFriendly",
      label: "Beginner friendly?",
      kind: "boolean",
      initialValue: "Yes",
    },
    {
      blockId: "intensity",
      label: "Intensity",
      kind: "select",
      options: ["Casual", "Competitive", "Mixed"],
      initialValue: "Mixed",
    },
  ],
};

export const buildHyroxModal = (metadata: CommandMetadata) =>
  buildActivityModal(hyroxModalConfig, metadata);
