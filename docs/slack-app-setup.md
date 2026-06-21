# Slack app setup

This guide configures TeamLoop in HTTP mode. Socket Mode is intentionally not
used because it is unsuitable for public Slack Marketplace distribution.

## 1. Start TeamLoop and expose HTTPS

Run the app on port 3000, then create a tunnel:

```bash
ngrok http 3000
```

Use the resulting HTTPS origin as `APP_BASE_URL`.

## 2. Create the Slack app

Create an app at [api.slack.com/apps](https://api.slack.com/apps), either from
scratch or from [`manifest.yml`](../manifest.yml). Replace every
`https://YOUR_DOMAIN` value with the tunnel or deployed origin.

## 3. Add bot scopes

Under **OAuth & Permissions**, add:

- `commands` — receives the six slash commands.
- `chat:write` — posts and updates event cards and reminders.
- `chat:write.public` — allows a slash command to create a card in a public
  channel where the bot has not already been invited.

Private channels must explicitly include the app. TeamLoop does not request
`users:read`, channel read scopes, direct-message scopes, or message history.

## 4. Add slash commands

Create each command with request URL
`https://YOUR_DOMAIN/slack/events`:

- `/lunch`
- `/dinner`
- `/potluck`
- `/weekendrun`
- `/marathon`
- `/hyrox`

## 5. Enable interactivity

Under **Interactivity & Shortcuts**, enable interactivity and set the request
URL to:

```text
https://YOUR_DOMAIN/slack/events
```

No shortcuts are required in V1.

## 6. Optional uninstall event

Under **Event Subscriptions**, enable events, use the same request URL, and add
the `app_uninstalled` bot event. TeamLoop clears the stored OAuth token and
cancels pending reminders when this event arrives.

## 7. Install for local development

Install the app into a test workspace. Copy the bot token and signing secret:

```dotenv
SLACK_SIGNING_SECRET=...
SLACK_BOT_TOKEN=xoxb-...
```

Restart TeamLoop and run `/lunch` in a test channel.

## 8. Configure OAuth distribution

Set the redirect URL in Slack:

```text
https://YOUR_DOMAIN/slack/oauth_redirect
```

Configure:

```dotenv
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_STATE_SECRET=a-random-secret-with-at-least-32-characters
TOKEN_ENCRYPTION_KEY=BASE64_ENCODED_32_BYTE_KEY
APP_BASE_URL=https://YOUR_DOMAIN
```

Generate an encryption key:

```bash
openssl rand -base64 32
```

Do not set `SLACK_BOT_TOKEN` in distributed mode. Open
`https://YOUR_DOMAIN/slack/install` to start OAuth.

## Manual smoke test

Create each event type, submit an RSVP from two users, set a preference, update
the event, send a reminder, close RSVPs, and cancel it. For a potluck, add a
contribution and confirm that it appears in the live card.
