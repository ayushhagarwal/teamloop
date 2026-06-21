<p align="center">
  <img src="assets/logo-placeholder.svg" alt="TeamLoop" width="520">
</p>

# TeamLoop

Plan team lunches, potlucks, runs, and fitness sessions directly in Slack.

[![CI](https://github.com/ayushhagarwal/teamloop/actions/workflows/ci.yml/badge.svg)](https://github.com/ayushhagarwal/teamloop/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/ayushhagarwal/teamloop)](https://github.com/ayushhagarwal/teamloop/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-5F9F68.svg)](LICENSE)
[![Open issues](https://img.shields.io/github/issues/ayushhagarwal/teamloop)](https://github.com/ayushhagarwal/teamloop/issues)

TeamLoop is an open-source Slack bot for planning real-world team activities —
lunches, dinners, potlucks, weekend runs, marathon training, and HYROX sessions.
It creates interactive Slack event cards with RSVPs, preferences, reminders,
organizer controls, and live-updating summaries.

> V1 is Slack-only, self-hostable, and deliberately small. There is no billing,
> dashboard, AI, calendar integration, or paid service dependency.

## What it does

- Creates an activity in under a minute with a slash command and modal.
- Keeps `Going`, `Maybe`, and `Can’t make it` counts current in one message.
- Collects food, pace, race, partner, beginner-group, and HYROX preferences.
- Tracks potluck contributions and categories that are still needed.
- Gives organizers edit, reminder, close-RSVP, cancel, and summary controls.
- Schedules idempotent RSVP-deadline and event-start reminders.
- Enforces organizer actions server-side and stores only coordination data.

| Command       | Activity-specific support                                    |
| ------------- | ------------------------------------------------------------ |
| `/lunch`      | Budget and food preference                                   |
| `/dinner`     | Budget, plus-one, and food preference                        |
| `/potluck`    | Needed categories and contribution claims                    |
| `/weekendrun` | Distance, pace, route, and beginner group                    |
| `/marathon`   | Race/training details, distance, target pace, beginner group |
| `/hyrox`      | Workout type, partner need, beginner support, and intensity  |

## Preview

```text
🍱 Team Lunch
Created by @ayush · Lunch · Status: Open

📅 Friday at 12:30 PM       📍 Green Cafe
⏰ RSVP by Friday 10 AM     ✅ 3 · 🤔 2 · ❌ 1

🍴 Lunch details
Budget: ₹500
Preferences: Veg 2 · Vegan 1

[✅ Going] [🤔 Maybe] [❌ Can’t make it] [Set food preference] [View summary]
```

Add sanitized product images to [`screenshots/`](screenshots/README.md) and a
demo GIF to [`demo/`](demo/README.md).

## Quick start with Docker

Requirements: Docker, Docker Compose, a Slack development workspace, and a
public HTTPS tunnel such as ngrok.

```bash
cp .env.example .env
# Add SLACK_SIGNING_SECRET and SLACK_BOT_TOKEN to .env
docker compose up --build
```

The app listens on `http://localhost:3000`; its health endpoint is
`GET /health`. Expose it while developing:

```bash
ngrok http 3000
```

Set Slack slash commands, interactivity, and event subscriptions to:

```text
https://YOUR_NGROK_DOMAIN/slack/events
```

Follow the full [Slack app setup guide](docs/slack-app-setup.md).

## Local development

```bash
npm install
docker compose up -d postgres
cp .env.example .env
npm run prisma:migrate
npm run dev
```

Useful commands:

```bash
npm run prisma:migrate:dev
npm run prisma:seed
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

See [local development](docs/local-development.md) and
[self-hosting](docs/self-hosting.md) for complete instructions.

## Slack installation modes

For one development workspace, set `SLACK_BOT_TOKEN`.

For distributed OAuth installs, set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`,
`SLACK_STATE_SECRET`, `TOKEN_ENCRYPTION_KEY`, and a public `APP_BASE_URL`.
TeamLoop then exposes:

- `/slack/install`
- `/slack/oauth_redirect`
- `/slack/events`

Workspace bot tokens are encrypted with AES-256-GCM when
`TOKEN_ENCRYPTION_KEY` is configured.

## Environment variables

| Variable               | Required   | Purpose                                    |
| ---------------------- | ---------- | ------------------------------------------ |
| `DATABASE_URL`         | Yes        | PostgreSQL connection URL                  |
| `SLACK_SIGNING_SECRET` | Yes        | Verifies requests from Slack               |
| `SLACK_BOT_TOKEN`      | Local mode | Single-workspace bot token                 |
| `SLACK_CLIENT_ID`      | OAuth mode | Slack app client ID                        |
| `SLACK_CLIENT_SECRET`  | OAuth mode | Slack app client secret                    |
| `SLACK_STATE_SECRET`   | OAuth mode | OAuth state signing secret, 32+ characters |
| `TOKEN_ENCRYPTION_KEY` | OAuth mode | Base64-encoded 32-byte key                 |
| `APP_BASE_URL`         | OAuth mode | Public HTTPS origin                        |
| `PORT`                 | No         | HTTP port; default `3000`                  |
| `DEFAULT_TIMEZONE`     | No         | Reserved for richer V1.1 timezone handling |
| `LOG_LEVEL`            | No         | `debug`, `info`, `warn`, or `error`        |

V1 modal times are labeled and interpreted as UTC. Slack renders stored UTC
timestamps in each viewer’s local timezone.

## Architecture

```text
Slack command/action
  → Bolt listener (acknowledges immediately)
  → Zod validation
  → Prisma service + PostgreSQL
  → reusable Block Kit renderer
  → chat.postMessage / chat.update

node-cron
  → atomically claims due reminder
  → sends one Slack message
  → records SENT or FAILED
```

The source is split by Slack surface (`commands`, `modals`, `blocks`,
`interactions`) and domain service (`event`, `rsvp`, `reminder`, `potluck`).

## Privacy

TeamLoop stores workspace and channel IDs, event details, Slack user IDs,
RSVPs, preferences, potluck items, reminders, and a small audit trail. It does
not store message history, private conversations, emails, or Slack profiles.
See [permissions and data](docs/permissions-and-data.md).

## Deployment

The included image runs Prisma migrations before starting the HTTP process.
Use HTTPS, persistent PostgreSQL storage, encrypted backups, and one scheduler
instance (or add distributed locking before scaling schedulers horizontally).
See [self-hosting](docs/self-hosting.md).

## Roadmap

- **V1.1:** preference and potluck item editing, event templates, better
  timezone support, App Home summary.
- **V1.2:** expense splitting, calendar export/integration, recurring
  activities, richer reminder controls.
- **V1.3:** hosted version, install landing page, workspace billing, admin
  dashboard.
- **V2:** Microsoft Teams, AI suggestions, restaurant discovery, advanced
  analytics, Marketplace polish.

Roadmap items are not part of this V1 implementation.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md),
[SECURITY.md](SECURITY.md), and [SUPPORT.md](SUPPORT.md) before opening a
contribution, support request, or security report.

Releases use semantic version tags such as `v1.0.0`. Maintainers can create a
tested tag and GitHub release from the **Release** workflow. See
[the release guide](docs/releasing.md).

## License

[MIT](LICENSE)
