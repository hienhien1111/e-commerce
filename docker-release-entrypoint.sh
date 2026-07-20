#!/bin/sh
set -eu

echo "🗄️  Applying production database migrations..."
bunx prisma migrate deploy

echo "🌱 Seeding production roles and permissions..."
bun prisma/seed.ts

echo "✅ Release database job completed"
