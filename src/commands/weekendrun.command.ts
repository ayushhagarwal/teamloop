import { EventType } from "@prisma/client";
import type { App } from "@slack/bolt";
import { buildWeekendRunModal } from "../modals/weekendrun.modal.js";
import { registerActivityCommand } from "./shared.command.js";

export const registerWeekendRunCommand = (app: App): void =>
  registerActivityCommand(
    app,
    "/weekendrun",
    EventType.WEEKEND_RUN,
    buildWeekendRunModal,
  );
