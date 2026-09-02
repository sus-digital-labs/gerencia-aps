#!/usr/bin/env bash
set -Eeuo pipefail

BASE_DIR="/opt/esus-pec"
INSTALL_DIR="/opt/e-SUS"
DOWNLOAD_DIR="$BASE_DIR/downloads"
BACKUP_DIR="$BASE_DIR/backups"
LOG_DIR="$BASE_DIR/logs"
DOCS_DIR="$BASE_DIR/docs"
TMP_DIR="$BASE_DIR/tmp"

TARGET_VERSION="5.4.37"
CURRENT_EXPECTED_VERSION="5.4.30"
JAR_URL="https://arquivos.esusaps.ufsc.br/PEC/687651a247e537a3/5.4.37/eSUS-AB-PEC-5.4.37-Linux64.jar"
JAR_PATH="$DOWNLOAD_DIR/eSUS-AB-PEC-5.4.37-Linux64.jar"
EXPECTED_JAR_SIZE="892232957"

TS="$(date +%Y%m%d_%H%M%S)"
MAIN_LOG="$LOG_DIR/update_esus_pec_${TARGET_VERSION}_${TS}.log"
INSTALLER_LOG="$LOG_DIR/update_esus_pec_${TARGET_VERSION}_installer_${TS}.log"
VALIDATION_LOG="$LOG_DIR/update_esus_pec_${TARGET_VERSION}_validation_${TS}.log"
REPORT_FILE="$DOCS_DIR/UPDATE_ESUS_PEC_${TARGET_VERSION}_${TS}.md"

PG_BIN="$INSTALL_DIR/database/postgresql-9.6.13-1-linux-x64/bin"
PG_DUMP="$PG_BIN/pg_dump"
PG_RESTORE="$PG_BIN/pg_restore"
PSQL="$PG_BIN/psql"

APP_BACKUP="$BACKUP_DIR/eSUS_app_nodata_pre_${TARGET_VERSION}_${TS}.tar.gz"
DB_BACKUP="$BACKUP_DIR/pec_esus_pre_${TARGET_VERSION}_${TS}.backup"
DB_BACKUP_SHA="$DB_BACKUP.sha256"
JAR_SHA=""
CURRENT_VERSION_BEFORE=""
CURRENT_VERSION_AFTER=""
PHASE="init"

mkdir -p "$DOWNLOAD_DIR" "$BACKUP_DIR" "$LOG_DIR" "$DOCS_DIR" "$TMP_DIR"
chmod 700 "$BACKUP_DIR"
exec > >(tee -a "$MAIN_LOG") 2>&1

line() {
  printf '%s\n' "======================================================================"
}

section() {
  line
  printf '[SECTION] %s\n' "$*"
  line
}

info() {
  printf '[%s] [INFO] %s\n' "$(date -Iseconds)" "$*"
}

warn() {
  printf '[%s] [WARN] %s\n' "$(date -Iseconds)" "$*"
}

fail() {
  printf '[%s] [FAIL] %s\n' "$(date -Iseconds)" "$*" >&2
  exit 1
}

run() {
  info "CMD: $*"
  "$@"
}

on_error() {
  local line_no="$1"
  local exit_code="$2"
  warn "Falha na fase '$PHASE', linha $line_no, exit=$exit_code."
  warn "Log principal: $MAIN_LOG"
  warn "Backup do banco, se concluido: $DB_BACKUP"
  systemctl start e-SUS-AB-PostgreSQL.service >/dev/null 2>&1 || true
  if [ "$PHASE" = "backup_db" ] || [ "$PHASE" = "backup_app" ] || [ "$PHASE" = "download" ] || [ "$PHASE" = "preflight" ]; then
    systemctl start e-SUS-PEC.service >/dev/null 2>&1 || true
  fi
}
trap 'on_error "$LINENO" "$?"' ERR

require_root() {
  [ "$(id -u)" -eq 0 ] || fail "Execute como root."
}

require_commands() {
  local missing=0 cmd
  for cmd in curl sha256sum tar awk sed grep systemctl ss df free script java; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      warn "Comando ausente: $cmd"
      missing=1
    fi
  done
  [ -x "$PG_DUMP" ] || { warn "pg_dump interno ausente: $PG_DUMP"; missing=1; }
  [ -x "$PG_RESTORE" ] || { warn "pg_restore interno ausente: $PG_RESTORE"; missing=1; }
  [ -x "$PSQL" ] || { warn "psql interno ausente: $PSQL"; missing=1; }
  [ "$missing" -eq 0 ] || fail "Dependencias ausentes."
}

db_password() {
  awk -F= '/^spring\.datasource\.password=/{print substr($0,index($0,"=")+1); exit}' \
    "$INSTALL_DIR/webserver/config/application.properties"
}

public_info() {
  curl -sS --max-time 15 http://localhost:8080/api/public/info || true
}

extract_version() {
  sed -n 's/.*"versao"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1
}

wait_http() {
  local url="$1"
  local out_file="$2"
  local attempts="${3:-120}"
  local delay="${4:-5}"
  local n

  for n in $(seq 1 "$attempts"); do
    if curl -sS -I --max-time 10 "$url" > "$out_file" 2>"${out_file}.err"; then
      return 0
    fi
    sleep "$delay"
  done
  return 1
}

free_gb_root() {
  df -Pk / | awk 'NR==2{printf "%.1f", $4/1024/1024}'
}

preflight() {
  PHASE="preflight"
  section "Preflight"
  require_root
  require_commands

  [ -d "$INSTALL_DIR" ] || fail "Instalacao nao encontrada em $INSTALL_DIR"
  [ -f "$INSTALL_DIR/webserver/config/application.properties" ] || fail "application.properties nao encontrado"
  [ -f "$INSTALL_DIR/webserver/pec-bundle.jar" ] || fail "pec-bundle.jar nao encontrado"

  info "Host: $(hostname)"
  info "Disco livre em /: $(free_gb_root) GB"
  info "Memoria:"; free -h
  info "Servicos:"
  systemctl --no-pager --full status e-SUS-PEC.service e-SUS-AB-PostgreSQL.service | sed -n '1,80p' || true

  CURRENT_VERSION_BEFORE="$(public_info | extract_version)"
  info "Versao antes da atualizacao: ${CURRENT_VERSION_BEFORE:-indisponivel}"
  if [ -n "$CURRENT_VERSION_BEFORE" ] && [ "$CURRENT_VERSION_BEFORE" != "$CURRENT_EXPECTED_VERSION" ]; then
    warn "Versao atual diferente do esperado ($CURRENT_EXPECTED_VERSION): $CURRENT_VERSION_BEFORE"
  fi
}

download_installer() {
  PHASE="download"
  section "Download e validacao do instalador"

  if [ -s "$JAR_PATH" ]; then
    local_size="$(stat -c%s "$JAR_PATH")"
    if [ "$local_size" = "$EXPECTED_JAR_SIZE" ]; then
      info "JAR ja existe com tamanho esperado: $JAR_PATH"
    else
      warn "JAR local com tamanho inesperado ($local_size). Rebaixando."
      rm -f "$JAR_PATH"
    fi
  fi

  if [ ! -s "$JAR_PATH" ]; then
    run curl -fL --retry 3 --connect-timeout 20 --continue-at - --output "$JAR_PATH" "$JAR_URL"
  fi

  [ -s "$JAR_PATH" ] || fail "Download gerou arquivo vazio: $JAR_PATH"
  local_size="$(stat -c%s "$JAR_PATH")"
  [ "$local_size" = "$EXPECTED_JAR_SIZE" ] || fail "Tamanho do JAR inesperado: $local_size != $EXPECTED_JAR_SIZE"

  JAR_SHA="$(sha256sum "$JAR_PATH" | awk '{print $1}')"
  info "JAR: $JAR_PATH"
  info "SHA256: $JAR_SHA"
  java -jar "$JAR_PATH" -help | tee "$LOG_DIR/update_esus_pec_${TARGET_VERSION}_installer_help_${TS}.log"
}

backup_app_without_dbdata() {
  PHASE="backup_app"
  section "Backup da aplicacao sem data directory do PostgreSQL"
  run tar -czf "$APP_BACKUP" \
    --exclude="$INSTALL_DIR/database/postgresql-9.6.13-1-linux-x64/data" \
    "$INSTALL_DIR" \
    /lib/systemd/system/e-SUS-PEC.service \
    /lib/systemd/system/e-SUS-AB-PostgreSQL.service \
    /etc/systemd/system/e-SUS-PEC.service.d/override.conf
  chmod 600 "$APP_BACKUP"
  sha256sum "$APP_BACKUP" > "$APP_BACKUP.sha256"
  chmod 600 "$APP_BACKUP.sha256"
  info "Backup aplicacao: $APP_BACKUP"
  ls -lh "$APP_BACKUP" "$APP_BACKUP.sha256"
}

backup_database() {
  PHASE="backup_db"
  section "Backup consistente do banco"
  local pass
  pass="$(db_password)"
  [ -n "$pass" ] || fail "Senha do banco nao localizada."

  info "Parando e-SUS-PEC para congelar novas escritas antes do pg_dump."
  run systemctl stop e-SUS-PEC.service
  run systemctl start e-SUS-AB-PostgreSQL.service

  info "Conexoes no banco antes do backup:"
  PGPASSWORD="$pass" "$PSQL" -h localhost -p 5433 -U postgres -d esus -P pager=off \
    -c "select usename, state, count(*) from pg_stat_activity where datname='esus' group by usename,state order by 1,2;" || true

  info "Iniciando pg_dump custom comprimido. Isso pode demorar."
  PGPASSWORD="$pass" "$PG_DUMP" \
    --host=localhost \
    --port=5433 \
    --username=postgres \
    --format=custom \
    --compress=9 \
    --blobs \
    --no-owner \
    --no-privileges \
    --file="$DB_BACKUP" \
    esus
  unset PGPASSWORD

  chmod 600 "$DB_BACKUP"
  sha256sum "$DB_BACKUP" > "$DB_BACKUP_SHA"
  chmod 600 "$DB_BACKUP_SHA"

  info "Validando catalogo do backup com pg_restore -l."
  "$PG_RESTORE" -l "$DB_BACKUP" >/dev/null

  info "Backup banco: $DB_BACKUP"
  ls -lh "$DB_BACKUP" "$DB_BACKUP_SHA"
  info "Disco livre apos backup: $(free_gb_root) GB"
}

run_installer_update() {
  PHASE="installer"
  section "Atualizacao para ${TARGET_VERSION}"
  local cmd

  run systemctl start e-SUS-AB-PostgreSQL.service
  printf -v cmd '%q ' java -jar "$JAR_PATH" -console -continue
  info "Executando instalador oficial. Log completo: $INSTALLER_LOG"
  run script -q -c "$cmd" "$INSTALLER_LOG"

  if grep -qiE 'erro|error|falha|exception|nao foi possivel' "$INSTALLER_LOG"; then
    warn "O log do instalador contem termos de erro. A validacao final decidira o resultado."
  fi
}

apply_service_settings() {
  PHASE="service_settings"
  section "Reaplicando ajustes do servico"
  if ! id esus >/dev/null 2>&1; then
    run useradd --system --home "$INSTALL_DIR" --shell /usr/sbin/nologin --comment "e-SUS service user" esus
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

  run systemctl daemon-reload
  run systemctl enable e-SUS-AB-PostgreSQL.service
  run systemctl enable e-SUS-PEC.service
}

validate_runtime() {
  PHASE="validation"
  section "Validacao final"
  local esus_head="$TMP_DIR/update_${TARGET_VERSION}_esus_head_${TS}.txt"
  local info_json="$TMP_DIR/update_${TARGET_VERSION}_public_info_${TS}.json"

  rm -rf /tmp/PEC-* || true
  run systemctl restart e-SUS-AB-PostgreSQL.service
  run systemctl restart e-SUS-PEC.service

  wait_http "http://localhost:8080/esus/" "$esus_head" 120 5 || fail "Endpoint /esus/ nao respondeu."
  curl -sS --max-time 20 http://localhost:8080/api/public/info > "$info_json"
  CURRENT_VERSION_AFTER="$(cat "$info_json" | extract_version)"

  {
    echo "[TIMESTAMP] $(date -Iseconds)"
    echo "[VERSION_BEFORE] $CURRENT_VERSION_BEFORE"
    echo "[VERSION_AFTER] $CURRENT_VERSION_AFTER"
    echo
    echo "[STATUS PEC]"; systemctl status e-SUS-PEC.service --no-pager
    echo
    echo "[STATUS POSTGRES]"; systemctl status e-SUS-AB-PostgreSQL.service --no-pager
    echo
    echo "[PORTAS]"; ss -lntp | grep -E ':8080|:5433|:80|:443' || true
    echo
    echo "[CURL /esus/]"; cat "$esus_head"
    echo
    echo "[PUBLIC INFO]"; cat "$info_json"
    echo
    echo "[ULTIMAS LINHAS PEC LOG]"; tail -n 160 "$INSTALL_DIR/webserver/logs/pec.log" || true
  } | tee "$VALIDATION_LOG"

  [ "$CURRENT_VERSION_AFTER" = "$TARGET_VERSION" ] || fail "Versao validada '$CURRENT_VERSION_AFTER', esperado '$TARGET_VERSION'."
  info "Versao ${TARGET_VERSION} validada com sucesso."
}

generate_report() {
  PHASE="report"
  section "Relatorio"
  cat > "$REPORT_FILE" <<EOR
# Atualizacao e-SUS APS PEC ${TARGET_VERSION}

## Resultado
- Host: $(hostname)
- Data/hora: $(date -Iseconds)
- Versao antes: ${CURRENT_VERSION_BEFORE}
- Versao depois: ${CURRENT_VERSION_AFTER}
- Instalacao: ${INSTALL_DIR}
- Endpoint validado: http://localhost:8080/api/public/info

## Instalador
- URL: ${JAR_URL}
- Arquivo: ${JAR_PATH}
- SHA256: ${JAR_SHA}

## Backups criados antes da atualizacao
- Banco PostgreSQL: ${DB_BACKUP}
- SHA256 banco: ${DB_BACKUP_SHA}
- Aplicacao sem data directory: ${APP_BACKUP}
- SHA256 aplicacao: ${APP_BACKUP}.sha256

## Logs
- Log principal: ${MAIN_LOG}
- Log instalador: ${INSTALLER_LOG}
- Log validacao: ${VALIDATION_LOG}

## Observacoes de rollback
- O backup do banco foi feito com o pg_dump interno do PostgreSQL 9.6 enquanto o servico PEC estava parado.
- O tar da aplicacao exclui somente o data directory fisico do PostgreSQL, porque o banco esta preservado no dump logico acima.
EOR
  chmod 600 "$REPORT_FILE"
  info "Relatorio: $REPORT_FILE"
}

main() {
  section "Inicio da atualizacao e-SUS APS PEC ${TARGET_VERSION}"
  preflight
  download_installer
  backup_app_without_dbdata
  backup_database
  run_installer_update
  apply_service_settings
  validate_runtime
  generate_report
  section "Concluido"
  info "Atualizacao concluida para ${TARGET_VERSION}."
}

main "$@"
