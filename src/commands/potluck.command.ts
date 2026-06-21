import { EventType } from "@prisma/client";
import type { App } from "@slack/bolt";
import { buildPotluckModal } from "../modals/potluck.modal.js";
import { registerActivityCommand } from "./shared.command.js";

export const registerPotluckCommand = (app: App): void =>
  registerActivityCommand(app, "/potluck", EventType.POTLUCK, buildPotluckModal);
