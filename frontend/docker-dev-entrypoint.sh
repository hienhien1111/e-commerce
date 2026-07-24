#!/bin/sh
set -eu

# The dev server can retain stale webpack chunks after Fast Refresh failures.
# Keep this isolated to the development image; production uses the standalone
# build without this entrypoint.
rm -rf /app/.next

exec "$@"
