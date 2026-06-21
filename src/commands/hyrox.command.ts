import { EventType } from "@prisma/client";
import type { App } from "@slack/bolt";
import { buildHyroxModal } from "../modals/hyrox.modal.js";
import { registerActivityCommand } from "./shared.command.js";

export const registerHyroxCommand = (app: App): void =>
  registerActivityCommand(app, "/hyrox", EventType.HYROX, buildHyroxModal);
