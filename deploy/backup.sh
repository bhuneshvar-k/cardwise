#!/bin/sh
# Dump the database once a day and keep the last 14 dumps.
set -eu
umask 077 # dumps hold personal data: readable by the owner only
KEEP_DAYS=14
while true; do
  file="/backups/cardwise-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
  if pg_dump -h postgres -U cardwise -d cardwise | gzip > "$file.tmp"; then
    mv "$file.tmp" "$file"
    echo "backup written: $file"
  else
    rm -f "$file.tmp"
    echo "backup FAILED" >&2
  fi
  find /backups -name 'cardwise-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
  sleep 86400
done
