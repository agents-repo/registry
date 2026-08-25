#!/usr/bin/env bash
# Idempotent Cursor Cloud install: pinned Node/npm, then HUSKY=0 npm ci.
# Must terminate. Do not start long-running servers from this script.
set -euo pipefail

NVM_INSTALL_VERSION="v0.40.3"
DEFAULT_NODE_VERSION="24.18.0"
PINNED_NPM_VERSION="12.0.1"

activate_pinned_node() {
  export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
  if [[ ! -s "${NVM_DIR}/nvm.sh" ]]; then
    curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_INSTALL_VERSION}/install.sh" | bash
  fi
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

install_repo() {
  local repo_root="$1"
  echo "Cloud install: ${repo_root}"
  (
    cd "${repo_root}"
    activate_pinned_node
    export HUSKY=0
    npm ci
  )
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
install_repo "${REPO_ROOT}"
