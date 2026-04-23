#!/bin/sh
set -eu

mkdir -p /app/storage/auth/sessions
mkdir -p /app/storage/uploads
mkdir -p /app/storage/exports
mkdir -p /app/storage/backgrounds
mkdir -p /app/storage/release-covers
mkdir -p /app/storage/projects
mkdir -p /app/storage/releases
mkdir -p /app/storage/copies
mkdir -p /app/whisper.cpp

if [ -n "${DATABASE_URL:-}" ] && [ -d /app/prisma/migrations ]; then
  npx prisma migrate deploy
fi

exec "$@"
