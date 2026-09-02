#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="/opt/esus-pec"
SCRIPTS_DIR="$BASE_DIR/scripts"
LOG_DIR="$BASE_DIR/logs"
DOCS_DIR="$BASE_DIR/docs"
BACKUP_DIR="$BASE_DIR/backups"
SECRETS_DIR="$BASE_DIR/secrets"
JAR_PATH="$BASE_DIR/eSUS-AB-PEC-5.4.30-Linux64.jar"
INSTALL_DIR_DEFAULT="/opt/e-SUS"

TS="$(date +%Y%m%d_%H%M%S)"
MAIN_LOG="$LOG_DIR/install_run_${TS}.log"
BASELINE_LOG="$LOG_DIR/sprint0_baseline_${TS}.log"
INSTALLER_CHECK_LOG="$LOG_DIR/sprint1_installer_check_${TS}.log"
INSTALLER_RUN_LOG="$LOG_DIR/install_${TS}.log"
VALIDATION_LOG="$LOG_DIR/sprint2_validation_${TS}.log"

INSTALL_DIR=""
INSTALLER_SHA256=""
BACKUP_TAR=""

ENABLE_HTTPS="${ENABLE_HTTPS:-false}"
HTTPS_DOMAIN="${HTTPS_DOMAIN:-}"
HTTPS_PORT="${HTTPS_PORT:-8443}"
HTTPS_KEYSTORE_PATH="${HTTPS_KEYSTORE_PATH:-}"
HTTPS_KEYSTORE_PASSWORD_FILE="${HTTPS_KEYSTORE_PASSWORD_FILE:-}"
HTTPS_KEY_ALIAS="${HTTPS_KEY_ALIAS:-esusaps}"

mkdir -p "$SCRIPTS_DIR" "$LOG_DIR" "$DOCS_DIR" "$BACKUP_DIR" "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

exec > >(tee -a "$MAIN_LOG") 2>&1

log() {
  echo "[$(date -Iseconds)] $*"
}

run_cmd() {
  log "CMD: $*"
  "$@"
}

on_error() {
  log "ERRO na linha $1"
}
trap 'on_error $LINENO' ERR

collect_baseline() {
  {
    echo "[TIMESTAMP] $(date -Iseconds)"
    echo "[HOST] $(hostname)"
    echo "[TIMEZONE]"
    timedatectl | sed -n '1,8p'
    echo
    echo "[UNAME]"
    uname -a
    echo
    echo "[OS RELEASE]"
    lsb_release -a 2>/dev/null || cat /etc/os-release
    echo
    echo "[DISK]"
    df -h
    echo
    echo "[MEMORY]"
    free -h
    echo
    echo "[NETWORK]"
    ip a
    echo
    echo "[JAVA VERSION]"
    java -version
  } | tee "$BASELINE_LOG"
}

ensure_locale_ptbr() {
  if ! locale -a | grep -q '^pt_BR\.utf8$'; then
    log "Locale pt_BR.UTF-8 ausente; gerando locale para compatibilidade do PostgreSQL interno"
    sed -i 's/^# *\(pt_BR.UTF-8 UTF-8\)/\1/' /etc/locale.gen
    run_cmd locale-gen pt_BR.UTF-8
  fi
}

create_backup_snapshot() {
  local bts snapshot_dir pec_active pg_active
  bts="$(date +%Y%m%d_%H%M%S)"
  snapshot_dir="$BACKUP_DIR/snapshot_${bts}"
  BACKUP_TAR="$BACKUP_DIR/eSUS_installation_backup_${bts}.tar.gz"

  mkdir -p "$snapshot_dir"

  [ -f /lib/systemd/system/e-SUS-PEC.service ] && cp -a /lib/systemd/system/e-SUS-PEC.service "$snapshot_dir/"
  [ -f /lib/systemd/system/e-SUS-AB-PostgreSQL.service ] && cp -a /lib/systemd/system/e-SUS-AB-PostgreSQL.service "$snapshot_dir/"
  [ -f /etc/systemd/system/e-SUS-PEC.service.d/override.conf ] && cp -a /etc/systemd/system/e-SUS-PEC.service.d/override.conf "$snapshot_dir/e-SUS-PEC.override.conf"
  [ -f "$INSTALL_DIR_DEFAULT/webserver/config/application.properties" ] && cp -a "$INSTALL_DIR_DEFAULT/webserver/config/application.properties" "$snapshot_dir/"
  [ -f "$INSTALL_DIR_DEFAULT/webserver/config/credenciais.txt" ] && cp -a "$INSTALL_DIR_DEFAULT/webserver/config/credenciais.txt" "$snapshot_dir/credenciais.txt"

  pec_active=0
  pg_active=0
  systemctl is-active --quiet e-SUS-PEC.service && pec_active=1 || true
  systemctl is-active --quiet e-SUS-AB-PostgreSQL.service && pg_active=1 || true

  log "Parando serviços temporariamente para backup consistente"
  systemctl stop e-SUS-PEC.service || true
  systemctl stop e-SUS-AB-PostgreSQL.service || true

  log "Criando backup TAR: $BACKUP_TAR"
  if [ -f /etc/systemd/system/e-SUS-PEC.service.d/override.conf ]; then
    tar -czf "$BACKUP_TAR" /opt/e-SUS /lib/systemd/system/e-SUS-PEC.service /lib/systemd/system/e-SUS-AB-PostgreSQL.service /etc/systemd/system/e-SUS-PEC.service.d/override.conf
  else
    tar -czf "$BACKUP_TAR" /opt/e-SUS /lib/systemd/system/e-SUS-PEC.service /lib/systemd/system/e-SUS-AB-PostgreSQL.service
  fi

  ln -sfn "$BACKUP_TAR" "$BACKUP_DIR/latest_backup.tar.gz"
  printf '%s\n' "$BACKUP_TAR" > "$BACKUP_DIR/latest_backup_path.txt"

  if [ "$pg_active" -eq 1 ]; then
    systemctl start e-SUS-AB-PostgreSQL.service || true
  fi
  if [ "$pec_active" -eq 1 ]; then
    systemctl start e-SUS-PEC.service || true
  fi

  log "Backup concluído: $BACKUP_TAR"
}

wait_http_8080() {
  local retries=90
  local delay=5
  local i

  for i in $(seq 1 "$retries"); do
    if curl -sS -I --max-time 8 http://localhost:8080/esus/ > /tmp/esus_curl_head_${TS}.txt 2>/tmp/esus_curl_err_${TS}.txt; then
      return 0
    fi
    sleep "$delay"
  done
  return 1
}

apply_service_hardening() {
  if ! id esus >/dev/null 2>&1; then
    run_cmd useradd --system --home "$INSTALL_DIR" --shell /usr/sbin/nologin --comment "e-SUS service user" esus
  fi

  mkdir -p "$INSTALL_DIR/webserver/tmp"
  chown -R esus:esus "$INSTALL_DIR/webserver" "$INSTALL_DIR/jre"
  chmod -R u=rwX,g=rX,o=rX "$INSTALL_DIR/webserver" "$INSTALL_DIR/jre"
  chmod 750 "$INSTALL_DIR/webserver/tmp"

  mkdir -p /etc/systemd/system/e-SUS-PEC.service.d
  cat > /etc/systemd/system/e-SUS-PEC.service.d/override.conf <<'EOC'
[Service]
User=esus
Group=esus
WorkingDirectory=/opt/e-SUS/webserver
Environment=TMPDIR=/opt/e-SUS/webserver/tmp
Restart=always
RestartSec=10
TimeoutStartSec=180
TimeoutStopSec=120
UMask=0027
NoNewPrivileges=true
EOC

  systemctl daemon-reload
  systemctl enable e-SUS-PEC.service
  systemctl enable e-SUS-AB-PostgreSQL.service || true
}

configure_optional_https() {
  if [ "$ENABLE_HTTPS" != "true" ]; then
    log "HTTPS opcional desabilitado (padrão). Mantendo HTTP em 8080."
    return 0
  fi

  if [ -z "$HTTPS_DOMAIN" ] || [ -z "$HTTPS_KEYSTORE_PATH" ] || [ -z "$HTTPS_KEYSTORE_PASSWORD_FILE" ]; then
    log "ENABLE_HTTPS=true, mas faltam variáveis obrigatórias (HTTPS_DOMAIN, HTTPS_KEYSTORE_PATH, HTTPS_KEYSTORE_PASSWORD_FILE)."
    log "Mantendo aplicação sem HTTPS."
    return 0
  fi

  if [ "$HTTPS_PORT" = "443" ]; then
    log "Porta 443 não permitida por política atual. Ajustando HTTPS_PORT para 8443."
    HTTPS_PORT="8443"
  fi

  if [ ! -f "$HTTPS_KEYSTORE_PATH" ] || [ ! -f "$HTTPS_KEYSTORE_PASSWORD_FILE" ]; then
    log "Keystore ou arquivo de senha ausente. Mantendo sem HTTPS."
    return 0
  fi

  local pass
  pass="$(cat "$HTTPS_KEYSTORE_PASSWORD_FILE")"

  {
    echo
    echo "# HTTPS opcional (configurado pelo install_esus_pec_5_4_30.sh)"
    echo "server.port=${HTTPS_PORT}"
    echo "server.ssl.key-store=${HTTPS_KEYSTORE_PATH}"
    echo "server.ssl.key-store-password=${pass}"
    echo "server.ssl.key-alias=${HTTPS_KEY_ALIAS}"
    echo "security.require-ssl=true"
  } >> "$INSTALL_DIR/webserver/config/application.properties"

  log "HTTPS opcional configurado em porta ${HTTPS_PORT} para domínio ${HTTPS_DOMAIN}."
}

log "=== SPRINT 0: Pré-checks e baseline ==="
if ! java -version >/dev/null 2>&1; then
  log "Java não disponível. Abortando."
  exit 1
fi
collect_baseline

log "Verificando instalação existente"
EXISTING_INSTALL=0
if [ -d "$INSTALL_DIR_DEFAULT" ] || systemctl list-unit-files | grep -q '^e-SUS-PEC.service'; then
  EXISTING_INSTALL=1
fi

log "=== SPRINT 1: Validação do instalador ==="
if [ ! -f "$JAR_PATH" ]; then
  log "Instalador não encontrado: $JAR_PATH"
  exit 1
fi

{
  echo "[TIMESTAMP] $(date -Iseconds)"
  echo "[LS JAR]"
  ls -lah "$JAR_PATH"
  echo
  echo "[SHA256]"
  sha256sum "$JAR_PATH"
  echo
  echo "[HELP]"
  java -jar "$JAR_PATH" -help
} | tee "$INSTALLER_CHECK_LOG"

INSTALLER_SHA256="$(sha256sum "$JAR_PATH" | awk '{print $1}')"

if [ "$EXISTING_INSTALL" -eq 1 ]; then
  log "Instalação existente detectada; criando backup antes de alterações"
  create_backup_snapshot
fi

if [ -f "$INSTALL_DIR_DEFAULT/webserver/pec-bundle.jar" ]; then
  log "e-SUS PEC já instalado em $INSTALL_DIR_DEFAULT; pulando reinstalação do JAR"
  {
    echo "[TIMESTAMP] $(date -Iseconds)"
    echo "[SKIPPED] Instalação existente detectada; instalador JAR não executado."
  } > "$INSTALLER_RUN_LOG"
else
  log "Executando instalador em modo console não interativo"
  script -q -c "java -jar $JAR_PATH -console -continue" "$INSTALLER_RUN_LOG"
fi

INSTALL_DIR="$(find /opt -maxdepth 3 -type d -iname '*e-SUS*' | head -n1 || true)"
if [ -z "$INSTALL_DIR" ] || [ ! -f "$INSTALL_DIR/webserver/config/application.properties" ]; then
  log "Não foi possível detectar pasta final válida de instalação"
  exit 1
fi

if [ -z "$BACKUP_TAR" ]; then
  log "Criando backup pós-instalação e pré-hardening"
  create_backup_snapshot
fi

log "=== SPRINT 2: Subida, validação e hardening ==="
ensure_locale_ptbr
apply_service_hardening

rm -rf /tmp/PEC-* || true

systemctl restart e-SUS-AB-PostgreSQL.service
systemctl restart e-SUS-PEC.service

if ! wait_http_8080; then
  log "Primeira tentativa HTTP falhou; aplicando correção de limpeza TMP e reiniciando"
  rm -rf /tmp/PEC-* || true
  systemctl kill -s KILL e-SUS-PEC.service || true
  systemctl restart e-SUS-PEC.service
  wait_http_8080
fi

{
  echo "[TIMESTAMP] $(date -Iseconds)"
  echo "[STATUS PEC]"
  systemctl status e-SUS-PEC.service --no-pager
  echo
  echo "[JOURNAL PEC]"
  journalctl -u e-SUS-PEC.service -n 200 --no-pager
  echo
  echo "[PORTAS]"
  ss -lntp | grep -E ':8080|:80|:443|:5433' || true
  echo
  echo "[CURL /esus/]"
  cat /tmp/esus_curl_head_${TS}.txt
  echo
  echo "[UFW]"
  if command -v ufw >/dev/null 2>&1; then
    ufw status || true
    if ufw status | grep -q 'Status: active'; then
      ufw allow 8080/tcp || true
    fi
  else
    echo "ufw não instalado"
  fi
} | tee "$VALIDATION_LOG"

configure_optional_https

cat > "$DOCS_DIR/install_state.env" <<EOS
INSTALL_TIMESTAMP=$(date -Iseconds)
INSTALL_DIR=$INSTALL_DIR
INSTALLER_SHA256=$INSTALLER_SHA256
BACKUP_TAR=$BACKUP_TAR
BASELINE_LOG=$BASELINE_LOG
INSTALLER_CHECK_LOG=$INSTALLER_CHECK_LOG
INSTALLER_RUN_LOG=$INSTALLER_RUN_LOG
VALIDATION_LOG=$VALIDATION_LOG
MAIN_LOG=$MAIN_LOG
EOS

log "Instalação/configuração concluída"
log "Estado salvo em $DOCS_DIR/install_state.env"
