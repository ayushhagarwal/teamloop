import { EventType } from "@prisma/client";
import type { App } from "@slack/bolt";
import { buildMarathonModal } from "../modals/marathon.modal.js";
import { registerActivityCommand } from "./shared.command.js";

export const registerMarathonCommand = (app: App): void =>
  registerActivityCommand(app, "/marathon", EventType.MARATHON, buildMarathonModal);
