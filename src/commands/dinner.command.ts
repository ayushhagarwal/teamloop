import { EventType } from "@prisma/client";
import type { App } from "@slack/bolt";
import { buildDinnerModal } from "../modals/dinner.modal.js";
import { registerActivityCommand } from "./shared.command.js";

export const registerDinnerCommand = (app: App): void =>
  registerActivityCommand(app, "/dinner", EventType.DINNER, buildDinnerModal);
