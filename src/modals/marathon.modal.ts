import { EventType } from "@prisma/client";
import type { CommandMetadata } from "../types/slack.types.js";
import {
  buildActivityModal,
  callbackIdFor,
  type ActivityModalConfig,
} from "./shared.modal.js";

export const marathonModalConfig: ActivityModalConfig = {
  callbackId: callbackIdFor(EventType.MARATHON),
  title: "Create marathon plan",
  defaultTitle: "Marathon Training",
  locationLabel: "Meeting point",
  fields: [
    { blockId: "raceName", label: "Race name", kind: "text", optional: true },
    {
      blockId: "raceDate",
      label: "Race date (YYYY-MM-DD)",
      kind: "text",
      optional: true,
    },
    {
      blockId: "distance",
      label: "Distance",
      kind: "select",
      options: ["5K", "10K", "21K", "42K", "Custom"],
      initialValue: "10K",
    },
    {
      blockId: "customDistance",
      label: "Custom distance",
      kind: "text",
      optional: true,
    },
    { blockId: "targetPace", label: "Target pace", kind: "text", optional: true },
    {
      blockId: "beginnerFriendly",
      label: "Beginner group available?",
      kind: "boolean",
      initialValue: "Yes",
    },
  ],
};

export const buildMarathonModal = (metadata: CommandMetadata) =>
  buildActivityModal(marathonModalConfig, metadata);
