#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL nao definida."
  exit 1
fi

mkdir -p backups
filename="backups/barberflow-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > "$filename"
echo "Backup criado em $filename"
find backups -type f -name '*.dump' -mtime +"${BACKUP_RETENTION_DAYS:-14}" -delete
