#!/usr/bin/env bash
# Idempotent Cursor Cloud install: pinned Node/npm, then HUSKY=0 npm ci.
# Must terminate. Do not start long-running servers from this script.
set -euo pipefail

NVM_INSTALL_VERSION="v0.40.3"
DEFAULT_NODE_VERSION="24.18.0"
PINNED_NPM_VERSION="12.0.1"

ensure_nvm() {
  export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
  if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
    return 0
  fi

  local installer
  installer="$(mktemp)"
  # shellcheck disable=SC2064
  trap 'rm -f "${installer}"' RETURN
  curl --proto '=https' --tlsv1.2 -fsSL \
    "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_INSTALL_VERSION}/install.sh" \
    --output "${installer}"
  bash "${installer}"
}

activate_pinned_node() {
  ensure_nvm
  # shellcheck disable=SC1091
  source "${NVM_DIR}/nvm.sh"

  local node_version="${DEFAULT_NODE_VERSION}"
  if [[ -f .nvmrc ]]; then
    node_version="$(tr -d '[:space:]' < .nvmrc)"
  fi

  nvm install "${node_version}"
  nvm alias default "${node_version}"
  nvm use "${node_version}"

  # nvm which current can resolve to /exec-daemon/node on Cloud VMs.
  # Always prepend the versioned nvm bin so `env node` is the pin.
  local node_bin
  node_bin="$(dirname "$(nvm which "${node_version}")")"
  export PATH="${node_bin}:${PATH}"
  hash -r

  corepack enable npm
  corepack prepare "npm@${PINNED_NPM_VERSION}" --activate
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "Cloud install: ${REPO_ROOT}"
cd "${REPO_ROOT}"
activate_pinned_node
export HUSKY=0
npm ci
