# Local development

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- A Slack development workspace
- ngrok or another HTTPS tunnel

## Install and configure

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate
```

Add the signing secret and development workspace bot token to `.env`.

## Run

```bash
npm run dev
```

In another terminal:

```bash
ngrok http 3000
```

Point all slash commands and Slack interactivity to
`https://YOUR_DOMAIN/slack/events`.

## Database changes

Edit `prisma/schema.prisma`, then create a migration:

```bash
npm run prisma:migrate:dev -- --name describe_the_change
```

Never edit an already-deployed migration. The seed command creates only a demo
workspace record:

```bash
npm run prisma:seed
```

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Manual Slack checklist

1. Run `/lunch` and create a future event.
2. Click `Going`.
3. Respond `Maybe` from another user.
4. Set a food preference.
5. Send an organizer reminder.
6. Close RSVPs and confirm a new response is rejected.
7. Cancel the event and confirm the card changes.
8. Run `/dinner` and test a plus-one preference.
9. Run `/potluck`.
10. Claim a potluck item and confirm the user is marked going.
11. Confirm claimed and still-needed categories update.
12. Run `/weekendrun` and set a pace preference.
13. Run `/marathon` and save a target pace note.
14. Run `/hyrox` and save a HYROX preference.
15. Edit an organizer-owned event.
16. Try an organizer control from another user.
17. Open the full summary.
18. Confirm a scheduled reminder sends only once.
19. Inspect logs for useful context without Slack tokens.
20. Confirm the event, RSVP, preference, item, and reminder rows in PostgreSQL.

## Time handling

V1 modal labels explicitly use UTC. Values are converted to UTC `Date` values
and PostgreSQL stores them as timestamps. Slack date tokens render in the
viewer’s local timezone. Workspace-aware modal defaults are a V1.1 item.

## Common problems

- **`invalid_auth`:** reinstall the app and update `SLACK_BOT_TOKEN`.
- **`dispatch_failed` or timeout:** verify the ngrok URL and that interactions
  use `/slack/events`.
- **Card cannot post:** add `chat:write.public` or invite the app to the channel.
- **Expired trigger ID:** make sure listeners acknowledge immediately and avoid
  breakpoints before `views.open`.
- **Database unavailable:** wait for `docker compose ps` to show PostgreSQL as
  healthy and verify `DATABASE_URL`.
