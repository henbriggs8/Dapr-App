#!/bin/sh
set -eu
if [ "${APP_ENV:-}" != staging ]; then
  echo 'Railway preparation entrypoint requires APP_ENV=staging.' >&2
  exit 1
fi
# Runtime bootstrap validates isolation before importing routes/SDKs.
# No migrations, seeds, identity-provider writes or secret retrieval at startup.
exec node dist/index.js
