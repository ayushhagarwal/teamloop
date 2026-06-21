import {
  EventStatus,
  ReminderStatus,
  type Event,
  type PrismaClient,
} from "@prisma/client";
import type {
  CreateEventInput,
  EventWithRelations,
  UpdateEventInput,
} from "../types/event.types.js";
import { metadataToJson } from "../types/event.types.js";
import { NotFoundError } from "../utils/errors.js";
import { PermissionService } from "./permission.service.js";

export class EventService {
  constructor(
    private readonly db: PrismaClient,
    private readonly permissions = new PermissionService(),
  ) {}

  async create(input: CreateEventInput): Promise<EventWithRelations> {
    return this.db.$transaction(async (tx) => {
      const workspace = await tx.workspace.upsert({
        where: { slackTeamId: input.slackTeamId },
        update: {
          ...(input.slackTeamName ? { name: input.slackTeamName } : {}),
          uninstalledAt: null,
        },
        create: {
          slackTeamId: input.slackTeamId,
          ...(input.slackTeamName ? { name: input.slackTeamName } : {}),
        },
      });

      const channel = await tx.channel.upsert({
        where: {
          workspaceId_slackChannelId: {
            workspaceId: workspace.id,
            slackChannelId: input.slackChannelId,
          },
        },
        update: input.slackChannelName ? { name: input.slackChannelName } : {},
        create: {
          workspaceId: workspace.id,
          slackChannelId: input.slackChannelId,
          ...(input.slackChannelName ? { name: input.slackChannelName } : {}),
        },
      });

      const event = await tx.event.create({
        data: {
          workspaceId: workspace.id,
          channelId: channel.id,
          organizerSlackUserId: input.organizerSlackUserId,
          type: input.type,
          title: input.title,
          ...(input.description ? { description: input.description } : {}),
          location: input.location,
          eventStartsAt: input.eventStartsAt,
          ...(input.rsvpDeadlineAt ? { rsvpDeadlineAt: input.rsvpDeadlineAt } : {}),
          slackChannelId: input.slackChannelId,
          metadata: metadataToJson(input.metadata ?? {}),
        },
      });

      const neededCategories =
        input.type === "POTLUCK" && Array.isArray(input.metadata?.neededCategories)
          ? input.metadata.neededCategories
          : [];
      if (neededCategories.length) {
        await tx.potluckItem.createMany({
          data: neededCategories.map((category) => ({
            eventId: event.id,
            category,
            itemName: "Needed",
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          eventId: event.id,
          actorSlackUserId: input.organizerSlackUserId,
          action: "event.created",
          metadata: { type: input.type },
        },
      });

      return tx.event.findUniqueOrThrow({
        where: { id: event.id },
        include: this.relations(),
      });
    });
  }

  async getById(eventId: string): Promise<EventWithRelations> {
    const event = await this.db.event.findUnique({
      where: { id: eventId },
      include: this.relations(),
    });
    if (!event) throw new NotFoundError();
    return event;
  }

  async update(
    eventId: string,
    actorSlackUserId: string,
    input: UpdateEventInput,
  ): Promise<EventWithRelations> {
    const existing = await this.getById(eventId);
    this.permissions.assertOrganizer(existing, actorSlackUserId);

    return this.db.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: {
          ...input,
          ...(input.metadata ? { metadata: metadataToJson(input.metadata) } : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: existing.workspaceId,
          eventId,
          actorSlackUserId,
          action: "event.updated",
        },
      });
      return tx.event.findUniqueOrThrow({
        where: { id: eventId },
        include: this.relations(),
      });
    });
  }

  async setSlackMessage(eventId: string, channel: string, ts: string): Promise<Event> {
    return this.db.event.update({
      where: { id: eventId },
      data: { slackChannelId: channel, slackMessageTs: ts },
    });
  }

  async closeRsvp(
    eventId: string,
    actorSlackUserId: string,
  ): Promise<EventWithRelations> {
    const existing = await this.getById(eventId);
    this.permissions.assertOrganizer(existing, actorSlackUserId);

    return this.transition(existing, actorSlackUserId, EventStatus.RSVP_CLOSED, {
      closedAt: new Date(),
      action: "event.rsvp_closed",
    });
  }

  async cancel(eventId: string, actorSlackUserId: string): Promise<EventWithRelations> {
    const existing = await this.getById(eventId);
    this.permissions.assertOrganizer(existing, actorSlackUserId);

    return this.db.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: { status: EventStatus.CANCELLED, cancelledAt: new Date() },
      });
      await tx.reminder.updateMany({
        where: { eventId, status: ReminderStatus.PENDING },
        data: { status: ReminderStatus.CANCELLED },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: existing.workspaceId,
          eventId,
          actorSlackUserId,
          action: "event.cancelled",
        },
      });
      return tx.event.findUniqueOrThrow({
        where: { id: eventId },
        include: this.relations(),
      });
    });
  }

  private async transition(
    existing: EventWithRelations,
    actorSlackUserId: string,
    status: EventStatus,
    detail: { closedAt?: Date; action: string },
  ): Promise<EventWithRelations> {
    return this.db.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: existing.id },
        data: { status, ...(detail.closedAt ? { closedAt: detail.closedAt } : {}) },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: existing.workspaceId,
          eventId: existing.id,
          actorSlackUserId,
          action: detail.action,
        },
      });
      return tx.event.findUniqueOrThrow({
        where: { id: existing.id },
        include: this.relations(),
      });
    });
  }

  private relations() {
    return {
      rsvps: true,
      preferences: true,
      potluckItems: {
        where: { claimedBySlackUserId: { not: null } },
        orderBy: [{ category: "asc" as const }, { createdAt: "asc" as const }],
      },
    };
  }
}
