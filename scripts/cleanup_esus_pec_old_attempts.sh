#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# Cleanup de artefatos antigos do processo de instalacao do e-SUS APS PEC.
#
# Objetivo:
# - Remover arquivos de tentativas anteriores (logs/tmp/docs antigos) para
#   deixar apenas o estado atual/essencial.
# - Manter backups e scripts.
#
# Importante:
# - Nao remove /opt/e-SUS (instalacao atual)
# - Nao mexe em bancos/containers de producao (MariaDB/Janus/etc)
# -----------------------------------------------------------------------------

BASE_DIR="/opt/esus-pec"
LOG_DIR="$BASE_DIR/logs"
DOCS_DIR="$BASE_DIR/docs"
TMP_DIR="$BASE_DIR/tmp"
DOWNLOAD_DIR="$BASE_DIR/downloads"

STATE_FILE="$DOCS_DIR/install_restore_state.env"

TS="$(date +%Y%m%d_%H%M%S)"
RUN_LOG="$LOG_DIR/cleanup_${TS}.log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$RUN_LOG") 2>&1

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*"
}

keep_list_contains() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    if [ "$item" = "$needle" ]; then
      return 0
    fi
  done
  return 1
}

log "Iniciando cleanup"
log "Run log: $RUN_LOG"

KEEP_LOG_FILES=()
KEEP_DOC_FILES=(
  "$DOCS_DIR/INSTALL_REPORT.md"
  "$DOCS_DIR/INSTALL_RESTORE_REPORT.md"
  "$DOCS_DIR/install_restore_state.env"
)

if [ -f "$STATE_FILE" ]; then
  log "Carregando keep-list a partir de $STATE_FILE"
  # shellcheck disable=SC1090
  source "$STATE_FILE"

  # Mantem logs referencia do estado (se existirem).
  for p in "${MAIN_LOG:-}" "${BASELINE_LOG:-}" "${INSTALLER_LOG:-}" "${VALIDATION_LOG:-}"; do
    if [ -n "$p" ] && [ -f "$p" ]; then
      KEEP_LOG_FILES+=("$p")
    fi
  done
else
  log "State file nao encontrado ($STATE_FILE). Mantendo apenas logs mais recentes."
  # Mantem os 5 logs mais recentes como fallback
  while IFS= read -r p; do
    KEEP_LOG_FILES+=("$p")
  done < <(ls -1t "$LOG_DIR"/*.log 2>/dev/null | head -n 5 || true)
fi

# Sempre manter o próprio log de cleanup.
KEEP_LOG_FILES+=("$RUN_LOG")

log "KEEP logs:"
for f in "${KEEP_LOG_FILES[@]}"; do
  log "  - $f"
done

log "KEEP docs:"
for f in "${KEEP_DOC_FILES[@]}"; do
  log "  - $f"
done

log "Removendo arquivos nao essenciais em $LOG_DIR"
shopt -s nullglob
for f in "$LOG_DIR"/*.log; do
  if keep_list_contains "$f" "${KEEP_LOG_FILES[@]}"; then
    continue
  fi
  log "  rm -f $f"
  rm -f "$f"
done
shopt -u nullglob

log "Removendo docs antigos (mantendo relatorios atuais)"
shopt -s nullglob
for f in "$DOCS_DIR"/*; do
  # Mantem diretorios (se houver)
  if [ -d "$f" ]; then
    continue
  fi
  if keep_list_contains "$f" "${KEEP_DOC_FILES[@]}"; then
    continue
  fi
  log "  rm -f $f"
  rm -f "$f"
done
shopt -u nullglob

log "Limpando temporarios"
rm -rf "$TMP_DIR"/* 2>/dev/null || true
rm -rf "$DOWNLOAD_DIR"/* 2>/dev/null || true

log "Removendo arquivos de containerizacao locais (nao usados para PEC no host)"
rm -f "$BASE_DIR/Dockerfile" "$BASE_DIR/docker-compose.yml" 2>/dev/null || true

log "Cleanup concluido"
log "Disk usage:"
df -h / || true

