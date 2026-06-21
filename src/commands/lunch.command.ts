import { EventType } from "@prisma/client";
import type { App } from "@slack/bolt";
import { buildLunchModal } from "../modals/lunch.modal.js";
import { registerActivityCommand } from "./shared.command.js";

export const registerLunchCommand = (app: App): void =>
  registerActivityCommand(app, "/lunch", EventType.LUNCH, buildLunchModal);
