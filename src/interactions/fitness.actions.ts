import { EventType } from "@prisma/client";

export function isFitnessEvent(type: EventType): boolean {
  return (
    type === EventType.WEEKEND_RUN ||
    type === EventType.MARATHON ||
    type === EventType.HYROX
  );
}
