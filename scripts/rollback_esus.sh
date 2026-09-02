#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="/opt/esus-pec"
LOG_DIR="$BASE_DIR/logs"
BACKUP_DIR="$BASE_DIR/backups"
TS="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$LOG_DIR/rollback_${TS}.log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

log() {
  echo "[$(date -Iseconds)] $*"
}

pick_backup() {
  if [ "${1:-}" != "" ]; then
    printf '%s\n' "$1"
    return 0
  fi

  if [ -f "$BACKUP_DIR/latest_backup_path.txt" ]; then
    cat "$BACKUP_DIR/latest_backup_path.txt"
    return 0
  fi

  ls -1t "$BACKUP_DIR"/eSUS_installation_backup_*.tar.gz 2>/dev/null | head -n1
}

wait_http() {
  local retries=90
  local delay=5
  local i

  for i in $(seq 1 "$retries"); do
    if curl -sS -I --max-time 8 http://localhost:8080/esus/ > /tmp/esus_rollback_curl_${TS}.txt 2>/tmp/esus_rollback_curl_err_${TS}.txt; then
      return 0
    fi
    sleep "$delay"
  done
  return 1
}

BACKUP_FILE="$(pick_backup "${1:-}")"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  log "Backup não encontrado. Informe o arquivo .tar.gz como argumento."
  exit 1
fi

log "Usando backup: $BACKUP_FILE"

tar -tzf "$BACKUP_FILE" >/dev/null

log "Parando serviços e-SUS"
systemctl stop e-SUS-PEC.service || true
systemctl stop e-SUS-AB-PostgreSQL.service || true

log "Removendo instalação atual"
rm -rf /opt/e-SUS

log "Restaurando backup"
tar -xzf "$BACKUP_FILE" -C /

if [ -f /etc/systemd/system/e-SUS-PEC.service.d/override.conf ]; then
  log "Override existente em /etc/systemd/system/e-SUS-PEC.service.d/override.conf"
fi

systemctl daemon-reload

log "Subindo serviços restaurados"
systemctl start e-SUS-AB-PostgreSQL.service || true
systemctl start e-SUS-PEC.service || true

if ! wait_http; then
  log "Falha na validação HTTP pós-rollback"
  systemctl status e-SUS-PEC.service --no-pager || true
  journalctl -u e-SUS-PEC.service -n 200 --no-pager || true
  cat /tmp/esus_rollback_curl_err_${TS}.txt || true
  exit 1
fi

log "Rollback concluído com sucesso"
systemctl status e-SUS-PEC.service --no-pager || true
ss -lntp | grep -E ':8080|:5433' || true
cat /tmp/esus_rollback_curl_${TS}.txt || true
log "Log: $LOG_FILE"
