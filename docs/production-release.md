# Production release

The API container never runs Prisma migrations or seed code at startup. Run the
one-off `release` service before the API so multiple API replicas cannot race
on the database schema.

## Required configuration

Provide production secrets outside source control: `DATABASE_URL`, both RSA
key pairs, `AUTH_FORGOT_SECRET`, `AUTH_CONFIRM_EMAIL_SECRET`,
`RESEND_API_KEY`, and `RESEND_FROM`. `RESEND_FROM` must be a sender from a
verified Resend domain; `onboarding@resend.dev` is only for development or
limited testing.

Set `NODE_ENV=production` and a publicly reachable `NEXT_PUBLIC_API_URL`.
Do not mount source directories or expose Prisma Studio in production.

## Deploy

Build and run the release job first. It runs `prisma migrate deploy` followed
by `prisma db seed`, then exits.

```sh
docker compose -f docker-compose.yaml -f docker-compose.production.yaml up --build release
docker compose -f docker-compose.yaml -f docker-compose.production.yaml up -d --build api frontend
```

The production override removes development source mounts, uses the production
API/frontend targets, and keeps the API dependent on a successful release job.

## Bootstrap an administrator

The standard seed only creates `admin@example.com` in `development` and
`test`. For production, run this one-off command after the release job with
deployment-managed secrets:

```sh
bun run admin:create -- --email admin@example.com --password 'A-Strong-Password1!'
```

The command requires at least 10 characters with uppercase, lowercase, number,
and symbol, and creates or updates an already verified local-email admin.
