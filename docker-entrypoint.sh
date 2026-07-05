#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding starter project templates (skips ones that already exist)..."
npx prisma db seed

exec "$@"
