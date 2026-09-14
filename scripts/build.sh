#!/usr/bin/env bash
set -euo pipefail
export PATH="${HOME}/.local/node/bin:${HOME}/.cargo/bin:${PATH}"
cd "$(dirname "$0")/.."
npm test
npm run tauri build
