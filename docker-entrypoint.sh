#!/bin/sh
set -e

cd /app
npm ci --prefer-offline --no-audit

exec "$@"
