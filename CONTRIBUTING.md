# Contributing to TeamLoop

Thanks for helping teams plan things without a 47-message RSVP thread.

## Development workflow

1. Read [docs/local-development.md](docs/local-development.md).
2. Create a focused branch from `main`.
3. Add or update tests with behavior changes.
4. Run `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test`.
5. Open a pull request using the repository template.

Keep V1 changes small, privacy-conscious, and Slack-first. New dependencies
should be open source and should not make a paid service mandatory.

## Commit and pull request guidance

- Explain the user problem, not only the code change.
- Include manual Slack testing notes for interaction changes.
- Avoid unrelated formatting or refactors.
- Never include workspace tokens, signing secrets, user data, or production logs.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
