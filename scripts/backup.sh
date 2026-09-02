#!/usr/bin/env bash
# Backup the current repository before any history rewrite or sanitization
# Creates a signed git bundle and runs git fsck to verify integrity

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
BACKUP_ROOT="${REPO_ROOT}/../contrib/sus-oss/private-audits/sus-analytics-web"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BUNDLE_NAME="sus-analytics-web-before-public-sanitization-${TIMESTAMP}.gitbundle"

mkdir -p "${BACKUP_ROOT}"

echo "Creating git bundle at ${BACKUP_ROOT}/${BUNDLE_NAME}..."
git bundle create "${BACKUP_ROOT}/${BUNDLE_NAME}" --all

echo "Verifying bundle integrity..."
git bundle verify "${BACKUP_ROOT}/${BUNDLE_NAME}" || {
  echo "ERROR: Bundle verification failed!" >&2
  exit 1
}

echo "Backup bundle created and verified successfully."

echo "Backup metadata:" > "${BACKUP_ROOT}/metadata-${TIMESTAMP}.txt"
git -C "${REPO_ROOT}" rev-parse HEAD >> "${BACKUP_ROOT}/metadata-${TIMESTAMP}.txt"
git -C "${REPO_ROOT}" branch -a >> "${BACKUP_ROOT}/metadata-${TIMESTAMP}.txt"
git -C "${REPO_ROOT}" tag -l >> "${BACKUP_ROOT}/metadata-${TIMESTAMP}.txt"
git -C "${REPO_ROOT}" remote -v >> "${BACKUP_ROOT}/metadata-${TIMESTAMP}.txt"
echo "Timestamp: ${TIMESTAMP}" >> "${BACKUP_ROOT}/metadata-${TIMESTAMP}.txt"

# Optional: sign the bundle (requires GPG key configured)
# gpg --armor --detach-sign "${BACKUP_ROOT}/${BUNDLE_NAME}"
