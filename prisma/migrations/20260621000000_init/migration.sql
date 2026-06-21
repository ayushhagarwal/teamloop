-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('LUNCH', 'DINNER', 'POTLUCK', 'WEEKEND_RUN', 'MARATHON', 'HYROX');
CREATE TYPE "EventStatus" AS ENUM ('OPEN', 'RSVP_CLOSED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "RsvpStatus" AS ENUM ('GOING', 'MAYBE', 'CANNOT_MAKE_IT');
CREATE TYPE "ReminderType" AS ENUM ('RSVP_DEADLINE', 'EVENT_START', 'MANUAL');
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "slackTeamId" TEXT NOT NULL,
  "name" TEXT,
  "botUserId" TEXT,
  "installedBySlackUserId" TEXT,
  "accessToken" TEXT,
  "uninstalledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Channel" (
  "id" TEXT NOT NULL,
  "slackChannelId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "organizerSlackUserId" TEXT NOT NULL,
  "type" "EventType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "eventStartsAt" TIMESTAMP(3) NOT NULL,
  "rsvpDeadlineAt" TIMESTAMP(3),
  "status" "EventStatus" NOT NULL DEFAULT 'OPEN',
  "slackMessageTs" TEXT,
  "slackChannelId" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "cancelledAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RSVP" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "slackUserId" TEXT NOT NULL,
  "status" "RsvpStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RSVP_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Preference" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "slackUserId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PotluckItem" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "claimedBySlackUserId" TEXT,
  "servesCount" INTEGER,
  "dietaryType" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PotluckItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reminder" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "type" "ReminderType" NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "eventId" TEXT,
  "actorSlackUserId" TEXT,
  "action" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workspace_slackTeamId_key" ON "Workspace"("slackTeamId");
CREATE UNIQUE INDEX "Channel_workspaceId_slackChannelId_key" ON "Channel"("workspaceId", "slackChannelId");
CREATE INDEX "Event_workspaceId_status_idx" ON "Event"("workspaceId", "status");
CREATE INDEX "Event_eventStartsAt_idx" ON "Event"("eventStartsAt");
CREATE UNIQUE INDEX "RSVP_eventId_slackUserId_key" ON "RSVP"("eventId", "slackUserId");
CREATE INDEX "RSVP_eventId_status_idx" ON "RSVP"("eventId", "status");
CREATE UNIQUE INDEX "Preference_eventId_slackUserId_key_key" ON "Preference"("eventId", "slackUserId", "key");
CREATE INDEX "PotluckItem_eventId_category_idx" ON "PotluckItem"("eventId", "category");
CREATE INDEX "Reminder_status_scheduledFor_idx" ON "Reminder"("status", "scheduledFor");
CREATE UNIQUE INDEX "Reminder_eventId_type_scheduledFor_key" ON "Reminder"("eventId", "type", "scheduledFor");
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");
CREATE INDEX "AuditLog_eventId_idx" ON "AuditLog"("eventId");

ALTER TABLE "Channel" ADD CONSTRAINT "Channel_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RSVP" ADD CONSTRAINT "RSVP_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PotluckItem" ADD CONSTRAINT "PotluckItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
