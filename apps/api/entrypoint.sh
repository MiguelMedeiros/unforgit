#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting API server..."
exec node apps/api/dist/index.js
