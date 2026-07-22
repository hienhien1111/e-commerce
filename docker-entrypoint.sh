#!/bin/sh
# Entrypoint for development container
# Restores the real prisma.config.ts (which requires DATABASE_URL) after
# the build stage used the generate-only config.

# Prisma.config.ts thực sự sẽ được mount qua volume (docker-compose.override.yaml)
# Chạy prisma generate lại để đảm bảo generated client dùng đúng schema
echo "🔧 Running prisma generate..."
# Generation does not require a database connection. Using the build-only
# config avoids a Prisma CLI hang observed when the runtime config is mounted
# during container startup. Keep a timeout so a transient CLI issue never
# prevents the development API from becoming available.
if ! timeout 60s bunx prisma generate --config prisma.generate.config.ts; then
  echo "⚠️  Prisma client generation did not complete; continuing with the client bundled in the image."
fi

echo "🗄️  Applying database migrations..."
bunx prisma migrate deploy

echo "🌱 Seeding default roles and permissions..."
bunx prisma db seed

echo "🚀 Starting NestJS..."
exec "$@"
