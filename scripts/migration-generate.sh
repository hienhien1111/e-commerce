#!/bin/bash
MIGRATION_NAME=$1
if [ -z "$MIGRATION_NAME" ]; then
  echo "Usage: migration:generate <migration-name>"
  exit 1
fi
rimraf dist
bun run typeorm -- --dataSource=src/database/data-source.ts migration:generate "src/database/migrations/$MIGRATION_NAME"
