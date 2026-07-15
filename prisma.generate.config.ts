// Prisma config for schema generation only (no DATABASE_URL required)
// Used during Docker build: bunx prisma generate --config prisma.generate.config.ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
});
