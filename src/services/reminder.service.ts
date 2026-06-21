import {
  EventStatus,
  ReminderStatus,
  ReminderType,
  type PrismaClient,
  type Reminder,
} from "@prisma/client";
import { minutesBefore } from "../utils/date.js";

export class ReminderService {
  constructor(private readonly db: PrismaClient) {}

  async createDefaults(input: {
    eventId: string;
    eventStartsAt: Date;
    rsvpDeadlineAt?: Date;
    eventReminderMinutes?: number;
  }): Promise<void> {
    const reminders: Array<{
      eventId: string;
      type: ReminderType;
      scheduledFor: Date;
    }> = [];

    if (input.rsvpDeadlineAt) {
      reminders.push({
        eventId: input.eventId,
        type: ReminderType.RSVP_DEADLINE,
        scheduledFor: minutesBefore(input.rsvpDeadlineAt, 60),
      });
    }
    if (input.eventReminderMinutes && input.eventReminderMinutes > 0) {
      reminders.push({
        eventId: input.eventId,
        type: ReminderType.EVENT_START,
        scheduledFor: minutesBefore(input.eventStartsAt, input.eventReminderMinutes),
      });
    }

    for (const reminder of reminders.filter((item) => item.scheduledFor > new Date())) {
      await this.db.reminder.upsert({
        where: {
          eventId_type_scheduledFor: reminder,
        },
        update: {},
        create: reminder,
      });
    }
  }

  async createManual(eventId: string): Promise<Reminder> {
    return this.db.reminder.create({
      data: {
        eventId,
        type: ReminderType.MANUAL,
        scheduledFor: new Date(),
      },
    });
  }

  async due(now = new Date(), limit = 50) {
    return this.db.reminder.findMany({
      where: {
        status: ReminderStatus.PENDING,
        scheduledFor: { lte: now },
        event: { status: { not: EventStatus.CANCELLED } },
      },
      include: { event: true },
      orderBy: { scheduledFor: "asc" },
      take: limit,
    });
  }

  async claim(reminderId: string): Promise<boolean> {
    const result = await this.db.reminder.updateMany({
      where: { id: reminderId, status: ReminderStatus.PENDING },
      data: {
        status: ReminderStatus.PROCESSING,
        attemptCount: { increment: 1 },
      },
    });
    return result.count === 1;
  }

  async markSent(reminderId: string): Promise<void> {
    await this.db.reminder.update({
      where: { id: reminderId },
      data: { status: ReminderStatus.SENT, sentAt: new Date(), lastError: null },
    });
  }

  async markFailed(reminderId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : "Unknown reminder error";
    await this.db.reminder.update({
      where: { id: reminderId },
      data: {
        status: ReminderStatus.FAILED,
        lastError: message.slice(0, 500),
      },
    });
  }
}
