#!/bin/bash
set -e

npm install --no-audit --no-fund

if [ -d artifacts/mockup-sandbox ]; then
  ( cd artifacts/mockup-sandbox && npm install --no-audit --no-fund )
fi
