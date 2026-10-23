#!/bin/bash
# SessionStart (só na nuvem): instala as dependências npm para tsc, vitest, oxlint, build e e2e.
# O Chromium já vem em /opt/pw-browsers (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1); não baixar navegador.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm install --no-audit --no-fund --loglevel=error
