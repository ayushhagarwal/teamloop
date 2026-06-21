import { EventType } from "@prisma/client";
import type { CommandMetadata } from "../types/slack.types.js";
import {
  buildActivityModal,
  callbackIdFor,
  type ActivityModalConfig,
} from "./shared.modal.js";

export const weekendRunModalConfig: ActivityModalConfig = {
  callbackId: callbackIdFor(EventType.WEEKEND_RUN),
  title: "Create weekend run",
  defaultTitle: "Weekend Run",
  locationLabel: "Meeting point",
  fields: [
    {
      blockId: "distance",
      label: "Distance",
      kind: "select",
      options: ["3K", "5K", "10K", "Custom"],
      initialValue: "5K",
    },
    {
      blockId: "customDistance",
      label: "Custom distance",
      kind: "text",
      optional: true,
    },
    {
      blockId: "pace",
      label: "Pace",
      kind: "select",
      options: ["Easy", "Moderate", "Fast", "Mixed groups"],
      initialValue: "Mixed groups",
    },
    { blockId: "routeLink", label: "Route link", kind: "text", optional: true },
    {
      blockId: "beginnerFriendly",
      label: "Beginner friendly?",
      kind: "boolean",
      initialValue: "Yes",
    },
  ],
};

export const buildWeekendRunModal = (metadata: CommandMetadata) =>
  buildActivityModal(weekendRunModalConfig, metadata);
