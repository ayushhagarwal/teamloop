# Self-hosting

## Docker Compose

```bash
cp .env.example .env
# Configure Slack credentials and public APP_BASE_URL
docker compose up -d --build
```

The app container waits for PostgreSQL health, runs `prisma migrate deploy`,
and starts TeamLoop. Persist the `teamloop-postgres` volume.

## Production checklist

- Terminate TLS at a reverse proxy or load balancer.
- Keep `.env` and backups outside the repository.
- Set a 32+ character OAuth state secret.
- Set a base64-encoded 32-byte token encryption key.
- Restrict database network access.
- Monitor `/health`, process exits, Slack API errors, and failed reminders.
- Back up PostgreSQL and test restore procedures.
- Deploy migrations before or with application startup.

## Scaling

The HTTP app is stateless apart from PostgreSQL and may have multiple
instances. The reminder claim is atomic, but V1 is best operated with one
scheduler instance. At larger scale, separate the scheduler into a worker and
add a PostgreSQL advisory lock or queue.

## Backups

Example logical backup:

```bash
docker compose exec -T postgres pg_dump -U teamloop teamloop > teamloop.sql
```

Protect backups as sensitive because they contain Slack user IDs, event
locations, and encrypted workspace bot tokens.

## Deployment targets

Any platform that can run a Node.js container and PostgreSQL works. Configure a
stable HTTPS origin, port 3000, health checks, persistent database storage, and
the environment variables from `.env.example`. No paid platform is required.

## Upgrade

1. Back up PostgreSQL.
2. Pull the desired release.
3. Run `docker compose build`.
4. Run `docker compose up -d`.
5. Confirm `/health`, migrations, one slash command, and reminder delivery.
