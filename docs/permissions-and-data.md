# Permissions and data

TeamLoop follows a narrow, Slack-first data model.

## Slack scopes

| Scope               | Why it is needed                                                                    |
| ------------------- | ----------------------------------------------------------------------------------- |
| `commands`          | Receives `/lunch`, `/dinner`, `/potluck`, `/weekendrun`, `/marathon`, and `/hyrox`. |
| `chat:write`        | Posts and updates event cards, reminders, and ephemeral summaries.                  |
| `chat:write.public` | Posts the initial card in a public channel when the app has not been invited.       |

No user token scopes are requested. Private channels must invite the app.
TeamLoop does not request message history, email, profile, direct-message,
file, admin, or broad channel-read scopes.

## Stored data

- Slack workspace ID, optional workspace name, bot user ID, installer user ID.
- OAuth bot token, encrypted with AES-256-GCM when an encryption key is set.
- Slack channel ID and optional channel name.
- Event title, type, time, location, notes, state, message timestamp, and
  activity-specific metadata.
- Slack user IDs associated with RSVPs, preferences, and potluck items.
- Reminder state and a minimal event audit trail.

## Data not stored

- Slack message history or thread contents.
- Private messages.
- Email addresses or full user profiles.
- Files, calendars, payment details, health records, or location history.
- Analytics or behavior outside explicit TeamLoop interactions.

## Logs

Logs include event/reminder IDs and error context. Secret-shaped logger fields
are redacted. Operators should still avoid adding raw Slack payloads to logs.

## Uninstall and deletion

When `app_uninstalled` is configured, TeamLoop removes the stored workspace
token and cancels pending reminders. Event data remains for the self-hosting
operator to manage.

Delete one workspace and all related records:

```sql
DELETE FROM "Workspace" WHERE "slackTeamId" = 'T_WORKSPACE_ID';
```

Foreign-key cascades remove channels, events, RSVPs, preferences, potluck
items, reminders, and audit logs. Operators should define a retention period
and include backups in deletion procedures.
