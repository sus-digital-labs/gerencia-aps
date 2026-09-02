#!/usr/bin/env bash
set -Eeuo pipefail

# -----------------------------------------------------------------------------
# e-SUS APS PEC 5.4.30 - Instalacao completa com restauracao de dump
# -----------------------------------------------------------------------------
# O objetivo deste script e automatizar:
# 1) backup seguro da instalacao atual
# 2) download do dump compactado
# 3) reinstalacao do PEC com -restore
# 4) hardening do systemd (usuario esus sem shell)
# 5) validacoes de servico/porta/endpoints
# 6) geracao de relatorio para documentacao
# -----------------------------------------------------------------------------

# ---------------------------- Configuracoes -----------------------------------
BASE_DIR="/opt/esus-pec"
SCRIPTS_DIR="$BASE_DIR/scripts"
LOG_DIR="$BASE_DIR/logs"
DOCS_DIR="$BASE_DIR/docs"
BACKUP_DIR="$BASE_DIR/backups"
SECRETS_DIR="$BASE_DIR/secrets"
DOWNLOAD_DIR="$BASE_DIR/downloads"
TMP_DIR="$BASE_DIR/tmp"

JAR_PATH="$BASE_DIR/eSUS-AB-PEC-5.4.30-Linux64.jar"
INSTALL_DIR="/opt/e-SUS"
DEFAULT_DUMP_SOURCE="http://149.78.176.0/dmtechnology/20260211205101-esus-postgres.backup"

# Variaveis customizaveis por ambiente (export ANTES de executar)
# Compatibilidade: DUMP_URL legado ainda e aceito como fallback.
DUMP_SOURCE="${DUMP_SOURCE:-${DUMP_URL:-$DEFAULT_DUMP_SOURCE}}"
INSTALL_PROFILE="${INSTALL_PROFILE:-producao}"      # producao|treinamento
FORCE_REINSTALL="${FORCE_REINSTALL:-true}"          # true|false
BACKUP_KEEP_COUNT="${BACKUP_KEEP_COUNT:-1}"         # numero de backups antigos a manter
MIN_FREE_GB_FOR_RESTORE="${MIN_FREE_GB_FOR_RESTORE:-2}"
STRICT_SPACE_CHECK="${STRICT_SPACE_CHECK:-false}"
KEEP_DOWNLOADED_DUMP="${KEEP_DOWNLOADED_DUMP:-false}"
STREAM_RESTORE_FROM_URL="${STREAM_RESTORE_FROM_URL:-true}"

TS="$(date +%Y%m%d_%H%M%S)"
MAIN_LOG="$LOG_DIR/install_restore_run_${TS}.log"
BASELINE_LOG="$LOG_DIR/install_restore_baseline_${TS}.log"
INSTALLER_LOG="$LOG_DIR/install_restore_installer_${TS}.log"
VALIDATION_LOG="$LOG_DIR/install_restore_validation_${TS}.log"
REPORT_FILE="$DOCS_DIR/INSTALL_RESTORE_REPORT.md"
STATE_FILE="$DOCS_DIR/install_restore_state.env"

ZIP_PATH=""
EXTRACT_DIR=""
DUMP_FILE=""
STREAM_DUMP_URL=""
STREAM_DUMP_EXT=""
DUMP_SOURCE_MODE="file"
DUMP_REMOTE_SIZE_BYTES=""
BACKUP_TAR=""
INSTALLER_SHA256=""
PUBLIC_IP=""
CURL_ESUS_RESULT=""
CURL_INFO_RESULT=""
RESTORE_METHOD="installer"

mkdir -p "$SCRIPTS_DIR" "$LOG_DIR" "$DOCS_DIR" "$BACKUP_DIR" "$SECRETS_DIR" "$DOWNLOAD_DIR" "$TMP_DIR"
chmod 700 "$SECRETS_DIR"

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

ok() {
  printf '[%s] [ OK ] %s\n' "$(date -Iseconds)" "$*"
}

fail() {
  printf '[%s] [FAIL] %s\n' "$(date -Iseconds)" "$*" >&2
  exit 1
}

run() {
  info "CMD: $*"
  "$@"
}

run_pg() {
  local pg_pass="$1"
  shift
  info "CMD: $*"
  PGPASSWORD="$pg_pass" "$@"
}

resolve_db_password() {
  local app_props cred_file pass
  app_props="$INSTALL_DIR/webserver/config/application.properties"
  cred_file="$INSTALL_DIR/webserver/config/credenciais.txt"
  pass=""

  if [ -f "$app_props" ]; then
    pass="$(awk -F= '/^spring\.datasource\.password=/{print substr($0, index($0, "=") + 1); exit}' "$app_props" | tr -d '\r' || true)"
  fi

  if [ -z "$pass" ] && [ -f "$cred_file" ]; then
    pass="$(sed -n 's/^senha:[[:space:]]*//p' "$cred_file" | head -n1 | tr -d '\r' || true)"
  fi

  printf '%s' "$pass"
}

is_true() {
  case "${1:-}" in
    1|true|TRUE|True|yes|YES|y|Y|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}

on_error() {
  local line_no="$1"
  local exit_code="$2"
  printf '[%s] [FAIL] Erro na linha %s (exit=%s). Verifique %s\n' "$(date -Iseconds)" "$line_no" "$exit_code" "$MAIN_LOG" >&2
  printf '[%s] [WARN] Tentando recuperar servicos apos falha...\n' "$(date -Iseconds)" >&2
  systemctl start e-SUS-AB-PostgreSQL.service >/dev/null 2>&1 || true
  systemctl start e-SUS-PEC.service >/dev/null 2>&1 || true
}
trap 'on_error "$LINENO" "$?"' ERR

require_root() {
  [ "$(id -u)" -eq 0 ] || fail "Execute como root."
}

require_commands() {
  local missing=0
  local cmd
  for cmd in java curl unzip tar find awk sed grep systemctl ss ip timedatectl df free gzip; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      warn "Comando ausente: $cmd"
      missing=1
    fi
  done
  [ "$missing" -eq 0 ] || fail "Dependencias ausentes."
}

collect_baseline() {
  {
    echo "[TIMESTAMP] $(date -Iseconds)"
    echo "[HOST] $(hostname)"
    echo "[TIMEZONE]"; timedatectl | sed -n '1,8p'
    echo
    echo "[UNAME]"; uname -a
    echo
    echo "[OS RELEASE]"; lsb_release -a 2>/dev/null || cat /etc/os-release
    echo
    echo "[DISK]"; df -h
    echo
    echo "[MEMORY]"; free -h
    echo
    echo "[NETWORK]"; ip a
    echo
    echo "[JAVA VERSION]"; java -version
  } | tee "$BASELINE_LOG"
}

ensure_locale_ptbr() {
  if ! locale -a | grep -q '^pt_BR\.utf8$'; then
    warn "Locale pt_BR.UTF-8 ausente. Gerando para evitar falha no PostgreSQL interno."
    sed -i 's/^# *\(pt_BR.UTF-8 UTF-8\)/\1/' /etc/locale.gen
    run locale-gen pt_BR.UTF-8
  fi
}

prune_old_backups() {
  section "Higiene de backups antigos"
  local backups total keep_count
  keep_count="$BACKUP_KEEP_COUNT"

  mapfile -t backups < <(ls -1t "$BACKUP_DIR"/eSUS_installation_backup_*.tar.gz 2>/dev/null || true)
  total="${#backups[@]}"
  info "Backups encontrados: $total"

  if [ "$total" -le "$keep_count" ]; then
    ok "Nenhum backup antigo para remover (mantendo $keep_count)."
    return 0
  fi

  local idx
  for ((idx=keep_count; idx<total; idx++)); do
    warn "Removendo backup antigo: ${backups[$idx]}"
    rm -f "${backups[$idx]}"
  done

  ok "Higiene de backups concluida."
}

create_current_install_backup() {
  section "Backup de seguranca da instalacao atual"
  local bts snapshot_dir
  bts="$(date +%Y%m%d_%H%M%S)"
  snapshot_dir="$BACKUP_DIR/snapshot_${bts}"
  BACKUP_TAR="$BACKUP_DIR/eSUS_installation_backup_${bts}.tar.gz"

  mkdir -p "$snapshot_dir"

  [ -f /lib/systemd/system/e-SUS-PEC.service ] && cp -a /lib/systemd/system/e-SUS-PEC.service "$snapshot_dir/"
  [ -f /lib/systemd/system/e-SUS-AB-PostgreSQL.service ] && cp -a /lib/systemd/system/e-SUS-AB-PostgreSQL.service "$snapshot_dir/"
  [ -f /etc/systemd/system/e-SUS-PEC.service.d/override.conf ] && cp -a /etc/systemd/system/e-SUS-PEC.service.d/override.conf "$snapshot_dir/e-SUS-PEC.override.conf"
  [ -f "$INSTALL_DIR/webserver/config/application.properties" ] && cp -a "$INSTALL_DIR/webserver/config/application.properties" "$snapshot_dir/"

  info "Parando servicos para backup consistente"
  systemctl stop e-SUS-PEC.service || true
  systemctl stop e-SUS-AB-PostgreSQL.service || true

  if [ -d "$INSTALL_DIR" ]; then
    if [ -f /etc/systemd/system/e-SUS-PEC.service.d/override.conf ]; then
      run tar -czf "$BACKUP_TAR" "$INSTALL_DIR" /lib/systemd/system/e-SUS-PEC.service /lib/systemd/system/e-SUS-AB-PostgreSQL.service /etc/systemd/system/e-SUS-PEC.service.d/override.conf
    else
      run tar -czf "$BACKUP_TAR" "$INSTALL_DIR" /lib/systemd/system/e-SUS-PEC.service /lib/systemd/system/e-SUS-AB-PostgreSQL.service
    fi

    ln -sfn "$BACKUP_TAR" "$BACKUP_DIR/latest_backup.tar.gz"
    printf '%s\n' "$BACKUP_TAR" > "$BACKUP_DIR/latest_backup_path.txt"
    ok "Backup criado: $BACKUP_TAR"
  else
    warn "Diretorio $INSTALL_DIR nao existe. Sem backup do app."
  fi
}

fetch_dump_source() {
  section "Obtencao do dump"
  local source source_no_query remote_size local_size file_name local_path
  source="$DUMP_SOURCE"

  ZIP_PATH=""
  DUMP_FILE=""
  STREAM_DUMP_URL=""
  STREAM_DUMP_EXT=""
  DUMP_SOURCE_MODE="file"
  DUMP_REMOTE_SIZE_BYTES=""

  # Caso 1: caminho local informado
  if [ -f "$source" ]; then
    info "Usando dump local: $source"
    case "$source" in
      *.zip)
        ZIP_PATH="$source"
        extract_dump_file
        return 0
        ;;
      *.backup|*.dump|*.sql|*.sql.gz|*.tar)
        DUMP_FILE="$source"
        run ls -lah "$DUMP_FILE"
        ok "Dump local selecionado"
        return 0
        ;;
      *)
        warn "Extensao nao reconhecida para dump local. Tentando usar arquivo mesmo assim: $source"
        DUMP_FILE="$source"
        run ls -lah "$DUMP_FILE"
        ok "Dump local selecionado"
        return 0
        ;;
    esac
  fi

  # Caso 2: URL remota
  case "$source" in
    http://*|https://*)
      source_no_query="${source%%\?*}"
      remote_size="$(curl -fsSI "$source" | awk '/^[Cc]ontent-[Ll]ength:/{gsub("\r","");print $2}' | tail -n1 || true)"
      DUMP_REMOTE_SIZE_BYTES="$remote_size"

      if [ -n "$remote_size" ]; then
        info "Tamanho remoto (bytes): $remote_size"
      else
        warn "Nao foi possivel obter Content-Length remoto."
      fi

      if is_true "$STREAM_RESTORE_FROM_URL"; then
        case "$source_no_query" in
          *.backup|*.dump|*.sql|*.sql.gz|*.tar)
            STREAM_DUMP_URL="$source"
            STREAM_DUMP_EXT="${source_no_query##*.}"
            DUMP_SOURCE_MODE="stream"
            DUMP_FILE="STREAM_URL:$source"
            ok "Dump remoto configurado para restore por stream (sem download local)"
            return 0
            ;;
        esac
      fi

      file_name="$(basename "${source%%\?*}")"
      local_path="$DOWNLOAD_DIR/$file_name"

      if [ -s "$local_path" ] && [ -n "$remote_size" ]; then
        local_size="$(stat -c%s "$local_path" 2>/dev/null || true)"
        if [ "$local_size" = "$remote_size" ]; then
          ok "Arquivo local ja existe com tamanho esperado. Reutilizando: $local_path"
        else
          info "Baixando: $source"
          run curl -fL --retry 3 --connect-timeout 20 --output "$local_path" "$source"
        fi
      else
        info "Baixando: $source"
        run curl -fL --retry 3 --connect-timeout 20 --output "$local_path" "$source"
      fi

      [ -s "$local_path" ] || fail "Download concluido, mas arquivo vazio: $local_path"

      case "$local_path" in
        *.zip)
          ZIP_PATH="$local_path"
          extract_dump_file
          ;;
        *)
          DUMP_FILE="$local_path"
          run ls -lah "$DUMP_FILE"
          ok "Dump remoto selecionado"
          ;;
      esac
      return 0
      ;;
    *)
      fail "DUMP_SOURCE invalido. Informe caminho local ou URL: $source"
      ;;
  esac
}

extract_dump_file() {
  section "Extracao do dump"

  # Remove extracoes antigas para evitar esgotar disco em execucoes repetidas.
  find "$DOWNLOAD_DIR" -maxdepth 1 -type d -name 'extracted_*' -exec rm -rf {} + 2>/dev/null || true

  EXTRACT_DIR="$DOWNLOAD_DIR/extracted_${TS}"
  mkdir -p "$EXTRACT_DIR"

  run unzip -o "$ZIP_PATH" -d "$EXTRACT_DIR"

  # Seleciona candidato mais adequado (preferencia por .backup/.dump/.sql/.sql.gz)
  local candidate_line
  candidate_line="$(find "$EXTRACT_DIR" -type f \
    \( -iname '*.backup' -o -iname '*.dump' -o -iname '*.sql' -o -iname '*.sql.gz' -o -iname '*.tar' \) \
    -printf '%s\t%p\n' | sort -nr | head -n1 || true)"

  if [ -z "$candidate_line" ]; then
    warn "Nenhum dump com extensao esperada encontrado. Tentando maior arquivo do ZIP."
    candidate_line="$(find "$EXTRACT_DIR" -type f -printf '%s\t%p\n' | sort -nr | head -n1 || true)"
  fi

  DUMP_FILE="$(printf '%s' "$candidate_line" | cut -f2-)"
  [ -n "$DUMP_FILE" ] || fail "Nao foi possivel localizar arquivo de dump em $EXTRACT_DIR"
  [ -f "$DUMP_FILE" ] || fail "Arquivo de dump detectado nao existe: $DUMP_FILE"

  info "Arquivo de dump selecionado: $DUMP_FILE"
  run ls -lah "$DUMP_FILE"
  ok "Extracao concluida"
}

validate_installer() {
  section "Validacao do instalador"
  [ -f "$JAR_PATH" ] || fail "Instalador nao encontrado: $JAR_PATH"

  {
    echo "[TIMESTAMP] $(date -Iseconds)"
    echo "[JAR]"; ls -lah "$JAR_PATH"
    echo
    echo "[SHA256]"; sha256sum "$JAR_PATH"
    echo
    echo "[HELP]"; java -jar "$JAR_PATH" -help
  } | tee "$LOG_DIR/install_restore_installer_check_${TS}.log"

  INSTALLER_SHA256="$(sha256sum "$JAR_PATH" | awk '{print $1}')"
  ok "Instalador validado"
}

prepare_clean_install() {
  section "Preparacao da reinstalacao"
  if is_true "$FORCE_REINSTALL"; then
    # Observacao importante:
    # O instalador do PEC em alguns cenarios assume "modo atualizacao" ao detectar
    # unidades systemd ja existentes. Remover /opt/e-SUS antes da execucao pode
    # quebrar essa deteccao e impedir subida do PostgreSQL interno.
    # Para manter idempotencia e seguranca em producao, fazemos restore in-place.
    info "FORCE_REINSTALL=true: executando restore in-place (sem remover $INSTALL_DIR)"
    if [ ! -d "$INSTALL_DIR" ]; then
      warn "Diretorio $INSTALL_DIR ausente. O instalador criara uma nova instalacao."
    fi
  else
    warn "FORCE_REINSTALL=false: mantendo instalacao atual"
  fi
}

run_installer_with_restore() {
  section "Instalacao do PEC com restore"
  local cmd
  local -a args

  args=(java -jar "$JAR_PATH")
  if [ "$INSTALL_PROFILE" = "treinamento" ]; then
    args+=(-treinamento)
    info "Perfil selecionado: treinamento"
  else
    info "Perfil selecionado: producao"
  fi
  if [ "$DUMP_SOURCE_MODE" = "stream" ]; then
    info "Restore sera aplicado apos instalacao, via stream remoto"
    args+=(-console -continue)
  else
    args+=(-console -continue "-restore=$DUMP_FILE")
  fi

  printf -v cmd '%q ' "${args[@]}"
  info "Executando instalador (log completo em $INSTALLER_LOG)"
  run script -q -c "$cmd" "$INSTALLER_LOG"

  if grep -qiE 'não foi possível conectar ao banco de dados|nao foi possivel conectar ao banco de dados' "$INSTALLER_LOG"; then
    fail "Instalador reportou falha de conexao com banco durante a instalacao."
  fi

  if [ "$DUMP_SOURCE_MODE" = "stream" ]; then
    warn "Restore em stream habilitado. Aplicando restore manual do dump remoto."
    RESTORE_METHOD="manual_pg_restore_stream"
    manual_restore_dump
  fi

  # O instalador pode encerrar com sucesso mesmo sem restaurar o dump.
  # Nesses casos, forca-se o restore manual do PostgreSQL interno.
  if [ "$DUMP_SOURCE_MODE" != "stream" ] && grep -qiE 'ja esta atualizado|já está atualizado|não foi possível obter a versão do banco de dados|nao foi possivel obter a versao do banco de dados|não é possível prosseguir|nao e possivel prosseguir' "$INSTALLER_LOG"; then
    warn "Instalador nao aplicou restore automaticamente. Executando manual_pg_restore."
    RESTORE_METHOD="manual_pg_restore"
    manual_restore_dump
  fi

  [ -d "$INSTALL_DIR" ] || fail "Instalacao nao detectada em $INSTALL_DIR"
  [ -f "$INSTALL_DIR/webserver/config/application.properties" ] || fail "application.properties nao encontrado"
  ok "Instalacao com restore concluida"
}

manual_restore_dump() {
  section "Restore manual do dump no PostgreSQL interno"
  local pg_bin
  local psql_cmd
  local dropdb_cmd
  local createdb_cmd
  local pg_restore_cmd
  local datasource_pass
  local free_kb free_gb dump_bytes dump_gb required_gb source_label

  pg_bin="$(find "$INSTALL_DIR/database" -maxdepth 4 -type f -name pg_restore | head -n1 | xargs -r dirname)"
  [ -n "$pg_bin" ] || fail "Nao foi possivel localizar pg_restore no PostgreSQL interno."

  psql_cmd="$pg_bin/psql"
  dropdb_cmd="$pg_bin/dropdb"
  createdb_cmd="$pg_bin/createdb"
  pg_restore_cmd="$pg_bin/pg_restore"

  [ -x "$psql_cmd" ] || fail "psql nao encontrado em $psql_cmd"
  [ -x "$dropdb_cmd" ] || fail "dropdb nao encontrado em $dropdb_cmd"
  [ -x "$createdb_cmd" ] || fail "createdb nao encontrado em $createdb_cmd"

  # Apos extrair o dump, o ZIP nao e mais necessario para o restore.
  # Removemos para recuperar espaco antes da verificacao.
  if [ -n "${ZIP_PATH:-}" ] && [ -f "$ZIP_PATH" ] && [ "$ZIP_PATH" != "$DUMP_FILE" ]; then
    rm -f "$ZIP_PATH" || true
  fi

  free_kb="$(df -Pk / | awk 'NR==2{print $4}')"
  free_gb="$((free_kb / 1024 / 1024))"
  dump_bytes=0
  dump_gb=0
  source_label="$DUMP_FILE"

  if [ "$DUMP_SOURCE_MODE" = "stream" ]; then
    source_label="STREAM_URL:$STREAM_DUMP_URL"
    if [ -n "$DUMP_REMOTE_SIZE_BYTES" ]; then
      dump_bytes="$DUMP_REMOTE_SIZE_BYTES"
    fi
  else
    dump_bytes="$(stat -c%s "$DUMP_FILE")"
  fi

  if [ "$dump_bytes" -gt 0 ]; then
    dump_gb="$(((dump_bytes + 1024*1024*1024 - 1) / 1024 / 1024 / 1024))"
    required_gb="$((dump_gb + 1))"
  else
    required_gb="$MIN_FREE_GB_FOR_RESTORE"
  fi

  if [ "$required_gb" -lt "$MIN_FREE_GB_FOR_RESTORE" ]; then
    required_gb="$MIN_FREE_GB_FOR_RESTORE"
  fi
  info "Fonte do restore: $source_label"
  info "Espaco livre: ${free_gb}GB | Dump estimado: ${dump_gb}GB | Minimo recomendado: ${required_gb}GB"
  if [ "$free_gb" -lt "$required_gb" ]; then
    if is_true "$STRICT_SPACE_CHECK"; then
      fail "Espaco insuficiente para restore seguro. Livre=${free_gb}GB, requerido>=${required_gb}GB."
    else
      warn "Espaco abaixo do recomendado; prosseguindo por STRICT_SPACE_CHECK=false."
    fi
  fi

  datasource_pass="$(resolve_db_password)"
  if [ -n "$datasource_pass" ]; then
    info "Senha do banco carregada automaticamente dos arquivos de configuracao"
  else
    fail "Nao foi possivel obter senha do datasource para restore nao interativo."
  fi

  run systemctl stop e-SUS-PEC.service || true
  run systemctl start e-SUS-AB-PostgreSQL.service
  run_pg "$datasource_pass" "$psql_cmd" -h localhost -p 5433 -U postgres -tAc "SELECT 1"
  run_pg "$datasource_pass" "$psql_cmd" -h localhost -p 5433 -U postgres -d postgres -tAc "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='esus' AND pid <> pg_backend_pid();" || true
  run_pg "$datasource_pass" "$dropdb_cmd" -h localhost -p 5433 -U postgres --if-exists esus
  run_pg "$datasource_pass" "$createdb_cmd" -h localhost -p 5433 -U postgres --owner=postgres esus

  if [ "$DUMP_SOURCE_MODE" = "stream" ]; then
    case "$STREAM_DUMP_URL" in
      *.backup|*.dump|*.tar)
        info "CMD: curl -fL --retry 3 '$STREAM_DUMP_URL' | PGPASSWORD=*** '$pg_restore_cmd' ... -d esus"
        curl -fL --retry 3 --connect-timeout 20 "$STREAM_DUMP_URL" | PGPASSWORD="$datasource_pass" "$pg_restore_cmd" -h localhost -p 5433 -U postgres --no-owner --no-privileges --exit-on-error -d esus
        ;;
      *.sql)
        info "CMD: curl -fL --retry 3 '$STREAM_DUMP_URL' | PGPASSWORD=*** '$psql_cmd' ... -d esus"
        curl -fL --retry 3 --connect-timeout 20 "$STREAM_DUMP_URL" | PGPASSWORD="$datasource_pass" "$psql_cmd" -h localhost -p 5433 -U postgres -d esus
        ;;
      *.sql.gz)
        info "CMD: curl -fL --retry 3 '$STREAM_DUMP_URL' | gzip -dc | PGPASSWORD=*** '$psql_cmd' ... -d esus"
        curl -fL --retry 3 --connect-timeout 20 "$STREAM_DUMP_URL" | gzip -dc | PGPASSWORD="$datasource_pass" "$psql_cmd" -h localhost -p 5433 -U postgres -d esus
        ;;
      *)
        fail "Extensao de dump remoto nao suportada para stream: $STREAM_DUMP_URL"
        ;;
    esac
  else
    case "$DUMP_FILE" in
      *.backup|*.dump|*.tar)
        run_pg "$datasource_pass" "$pg_restore_cmd" -h localhost -p 5433 -U postgres --no-owner --no-privileges --exit-on-error -d esus "$DUMP_FILE"
        ;;
      *.sql)
        run_pg "$datasource_pass" "$psql_cmd" -h localhost -p 5433 -U postgres -d esus -f "$DUMP_FILE"
        ;;
      *.sql.gz)
        info "CMD: gzip -dc '$DUMP_FILE' | PGPASSWORD=*** '$psql_cmd' -h localhost -p 5433 -U postgres -d esus"
        gzip -dc "$DUMP_FILE" | PGPASSWORD="$datasource_pass" "$psql_cmd" -h localhost -p 5433 -U postgres -d esus
        ;;
      *)
        fail "Extensao de dump nao suportada para restore manual: $DUMP_FILE"
        ;;
    esac

    if ! is_true "$KEEP_DOWNLOADED_DUMP"; then
      case "$DUMP_FILE" in
        "$DOWNLOAD_DIR"/*)
          rm -f "$DUMP_FILE" || true
          ;;
      esac
    fi
  fi

  ok "Restore manual do banco concluido"
}

apply_service_hardening() {
  section "Hardening de servico"
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

  ok "Hardening aplicado"
}

wait_http_endpoint() {
  local url="$1"
  local out_file="$2"
  local max_attempts="${3:-90}"
  local delay="${4:-5}"
  local n

  for n in $(seq 1 "$max_attempts"); do
    if curl -sS -I --max-time 10 "$url" > "$out_file" 2>"${out_file}.err"; then
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

validate_runtime() {
  section "Validacoes finais"
  local local_info_url local_esus_head local_info_head

  PUBLIC_IP="$(ip -4 route get 1.1.1.1 | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')"
  [ -n "$PUBLIC_IP" ] || PUBLIC_IP="127.0.0.1"

  run systemctl restart e-SUS-AB-PostgreSQL.service
  run systemctl restart e-SUS-PEC.service

  rm -rf /tmp/PEC-* || true

  local_esus_head="$TMP_DIR/curl_esus_${TS}.txt"
  local_info_head="$TMP_DIR/curl_info_${TS}.txt"
  local_info_url="http://localhost:8080/api/public/info"

  if ! wait_http_endpoint "http://localhost:8080/esus/" "$local_esus_head" 90 5; then
    fail "PEC nao respondeu em http://localhost:8080/esus/"
  fi

  # Validacao auxiliar no mesmo listener 8080 (sem alterar porta 80)
  if ! wait_http_endpoint "$local_info_url" "$local_info_head" 30 2; then
    warn "Endpoint auxiliar ainda nao respondeu: $local_info_url"
  fi

  CURL_ESUS_RESULT="$(head -n1 "$local_esus_head" || true)"
  CURL_INFO_RESULT="$(head -n1 "$local_info_head" || true)"

  {
    echo "[TIMESTAMP] $(date -Iseconds)"
    echo "[STATUS PEC]"; systemctl status e-SUS-PEC.service --no-pager
    echo
    echo "[STATUS POSTGRES]"; systemctl status e-SUS-AB-PostgreSQL.service --no-pager
    echo
    echo "[PORTAS]"; ss -lntp | grep -E ':18080|:8080|:443|:5433|:80 ' || true
    echo
    echo "[CURL /esus/]"; cat "$local_esus_head"
    echo
    echo "[CURL /api/public/info em 8080]"; cat "$local_info_head" || true
    echo
    echo "[JOURNAL PEC]"; journalctl -u e-SUS-PEC.service -n 200 --no-pager
  } | tee "$VALIDATION_LOG"

  ok "Validacoes concluidas"
}

generate_report() {
  section "Geracao de relatorio"
  cat > "$REPORT_FILE" <<EOR
# INSTALL RESTORE REPORT - e-SUS APS PEC 5.4.30

## Data/Hora
- Execucao: $(date -Iseconds)
- Host: $(hostname)
- Timezone: $(timedatectl show -p Timezone --value)

## Parametros
- DUMP_SOURCE: $DUMP_SOURCE
- DUMP_SOURCE_MODE: $DUMP_SOURCE_MODE
- STREAM_RESTORE_FROM_URL: $STREAM_RESTORE_FROM_URL
- STREAM_DUMP_URL: $STREAM_DUMP_URL
- ZIP baixado: $ZIP_PATH
- Dump utilizado: $DUMP_FILE
- Perfil: $INSTALL_PROFILE
- FORCE_REINSTALL: $FORCE_REINSTALL
- Portas 80/443: preservadas (sem alteracoes)
- Metodo de restore: $RESTORE_METHOD

## Instalador
- JAR: $JAR_PATH
- SHA256: $INSTALLER_SHA256
- Install dir: $INSTALL_DIR

## Servicos
- e-SUS-PEC: $(systemctl is-active e-SUS-PEC.service || true)
- e-SUS-AB-PostgreSQL: $(systemctl is-active e-SUS-AB-PostgreSQL.service || true)
- Usuario do PEC: $(ps -o user= -p "$(systemctl show -p MainPID --value e-SUS-PEC.service)" | xargs || true)

## Endpoints
- /esus/: $CURL_ESUS_RESULT
- /api/public/info (localhost:8080): $CURL_INFO_RESULT
- IP detectado: $PUBLIC_IP

## Backup e rollback
- Backup gerado: $BACKUP_TAR
- Rollback script: /opt/esus-pec/scripts/rollback_esus.sh

## Logs
- Main log: $MAIN_LOG
- Baseline: $BASELINE_LOG
- Installer log: $INSTALLER_LOG
- Validation log: $VALIDATION_LOG

## Checklist QA
- [x] Java validado
- [x] Instalador validado (SHA256)
- [x] Dump baixado e extraido
- [x] Instalacao com restore concluida
- [x] Servico PEC ativo
- [x] PostgreSQL ativo em 5433
- [x] Endpoint /esus/ responsivo
- [x] Endpoint /api/public/info responsivo em 8080
EOR

  cat > "$STATE_FILE" <<EOS
TIMESTAMP=$(date -Iseconds)
DUMP_SOURCE=$DUMP_SOURCE
DUMP_SOURCE_MODE=$DUMP_SOURCE_MODE
STREAM_RESTORE_FROM_URL=$STREAM_RESTORE_FROM_URL
STREAM_DUMP_URL=$STREAM_DUMP_URL
ZIP_PATH=$ZIP_PATH
DUMP_FILE=$DUMP_FILE
INSTALL_PROFILE=$INSTALL_PROFILE
FORCE_REINSTALL=$FORCE_REINSTALL
RESTORE_METHOD=$RESTORE_METHOD
INSTALL_DIR=$INSTALL_DIR
INSTALLER_SHA256=$INSTALLER_SHA256
BACKUP_TAR=$BACKUP_TAR
MAIN_LOG=$MAIN_LOG
BASELINE_LOG=$BASELINE_LOG
INSTALLER_LOG=$INSTALLER_LOG
VALIDATION_LOG=$VALIDATION_LOG
REPORT_FILE=$REPORT_FILE
EOS

  ok "Relatorio: $REPORT_FILE"
  ok "Estado: $STATE_FILE"
}

main() {
  require_root
  require_commands

  section "Inicio da automacao de instalacao com restore"
  info "Script: $0"
  info "Log principal: $MAIN_LOG"

  collect_baseline
  ensure_locale_ptbr
  validate_installer

  prune_old_backups
  create_current_install_backup
  fetch_dump_source
  prepare_clean_install
  run_installer_with_restore
  apply_service_hardening
  validate_runtime
  generate_report

  section "Concluido com sucesso"
  ok "Instalacao completa com restore finalizada"
}

main "$@"
