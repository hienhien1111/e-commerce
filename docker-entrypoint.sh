#!/bin/sh
# Entrypoint for development container
# Restores the real prisma.config.ts (which requires DATABASE_URL) after
# the build stage used the generate-only config.

# Prisma.config.ts thực sự sẽ được mount qua volume (docker-compose.override.yaml)
# Chạy prisma generate lại để đảm bảo generated client dùng đúng schema
echo "🔧 Running prisma generate..."
bunx prisma generate 2>/dev/null || true

echo "🚀 Starting NestJS..."
exec "$@"
