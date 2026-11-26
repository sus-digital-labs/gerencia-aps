#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
die() { printf '%s\n' "$*" >&2; exit 1; }

project_name=sus-analytics-web-anton254
export SUS_ANALYTICS_STATE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/$project_name"
export SUS_ANALYTICS_UID=$(id -u) SUS_ANALYTICS_GID=$(id -g)
umask 077
[[ ! -L $SUS_ANALYTICS_STATE_DIR ]] || die 'O diretório de configuração precisa ser local.'
install -d -m 0700 -- "$SUS_ANALYTICS_STATE_DIR"
[[ -O $SUS_ANALYTICS_STATE_DIR ]] || die 'Diretório de configuração inválido.'
[[ ! -L $SUS_ANALYTICS_STATE_DIR/b360 ]] || die 'O diretório de complementos precisa ser local.'
[[ ! -L $SUS_ANALYTICS_STATE_DIR/acs ]] || die 'O diretório de tarefas precisa ser local.'
install -d -m 0700 -- "$SUS_ANALYTICS_STATE_DIR/b360" "$SUS_ANALYTICS_STATE_DIR/acs"
exec 8>"$SUS_ANALYTICS_STATE_DIR/deploy.lock"
flock --exclusive 8

[[ -z ${DOCKER_HOST:-} && $(docker context show) == default ]] || die 'Use o Docker local do ANTON-254.'
pec=pec-anton223-db
mount=$(docker inspect --format '{{.State.Running}} {{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Source}}{{end}}{{end}}' "$pec")
[[ $mount == 'true /srv/databases/pec-anton223-local' ]] || die 'A cópia local do PEC precisa estar ativa no ANTON-254.'
[[ $(docker network inspect pec-anton223-local --format '{{.Internal}} {{range .Containers}}{{if eq .Name "pec-anton223-db"}}{{.Name}}{{end}}{{end}}') == 'true pec-anton223-db' ]] ||
  die 'A rede privada da cópia local do PEC não está disponível.'

image=node:24-bookworm-slim
image_id=$(docker image inspect "$image" --format '{{.Id}}') ||
  die 'Disponibilize a imagem node:24-bookworm-slim no Docker local.'
previous_release="$SUS_ANALYTICS_STATE_DIR/active-release"
previous_state=()
if [[ -r $previous_release ]]; then mapfile -t previous_state <"$previous_release"; fi
previous=${previous_state[0]:-}
previous_auth=${previous_state[1]:-}

owned_release=false
build_cache=
pending_auth=
owned_auth=
deployment_record=
cleanup() {
  if [[ -n $build_cache ]]; then docker volume rm "$build_cache" >/dev/null; fi
  if $owned_release; then docker volume rm "$SUS_ANALYTICS_APP_VOLUME" >/dev/null; fi
  for file in "$pending_auth" "$owned_auth" "$deployment_record"; do
    if [[ -n $file ]]; then rm -f -- "$file"; fi
  done
}
trap cleanup EXIT

superadmin_email=/srv/projects/dm-hub/secrets/shared_superadmin_user_email.txt
superadmin_password=/srv/projects/dm-hub/secrets/shared_admin_user_password.txt
for file in "$superadmin_email" "$superadmin_password"; do
  [[ -f $file && ! -L $file && -r $file && -s $file ]] || die "Credencial padrão indisponível: ${file##*/}"
done
previous_mount=()
if [[ $previous_auth == "$SUS_ANALYTICS_STATE_DIR"/superadmin-*.json && -f $previous_auth && ! -L $previous_auth ]]; then
  previous_mount+=(--mount "type=bind,source=$previous_auth,target=/run/previous-verifier,readonly")
fi
pending_auth=$(mktemp -- "$SUS_ANALYTICS_STATE_DIR/.superadmin-XXXXXXXX")
docker run --rm -i --pull never --network none --user "$SUS_ANALYTICS_UID:$SUS_ANALYTICS_GID" \
  --cap-drop ALL --security-opt no-new-privileges \
  --mount "type=bind,source=$superadmin_email,target=/run/operator-email,readonly" \
  --mount "type=bind,source=$superadmin_password,target=/run/operator-password,readonly" \
  --mount "type=bind,source=$PWD/apps/backend/local/operator-auth.ts,target=/operator-auth.mts,readonly" \
  "${previous_mount[@]}" "$image" node --input-type=module >"$pending_auth" <<'NODE'
import { existsSync } from "node:fs";
import { buildOperatorVerifier } from "/operator-auth.mts";
try {
  const previous = existsSync("/run/previous-verifier") ? "/run/previous-verifier" : undefined;
  const verifier = await buildOperatorVerifier("/run/operator-email", "/run/operator-password", previous);
  process.stdout.write(JSON.stringify(verifier) + "\n");
} catch {
  process.stderr.write("Não foi possível preparar o acesso do superadmin. Confira o formato e a leitura dos arquivos privados.\n");
  process.exitCode = 1;
}
NODE
verifier_id=$(sha256sum "$pending_auth" | cut -c1-24)
export SUS_ANALYTICS_AUTH_FILE="$SUS_ANALYTICS_STATE_DIR/superadmin-$verifier_id.json"
if [[ -e $SUS_ANALYTICS_AUTH_FILE ]]; then
  [[ -f $SUS_ANALYTICS_AUTH_FILE && ! -L $SUS_ANALYTICS_AUTH_FILE && -O $SUS_ANALYTICS_AUTH_FILE &&
    $(stat -c %a -- "$SUS_ANALYTICS_AUTH_FILE") == 600 ]] || die 'Verificador local com permissões inválidas.'
  cmp -s -- "$pending_auth" "$SUS_ANALYTICS_AUTH_FILE" || die 'Verificador local inconsistente.'
  rm -f -- "$pending_auth"
else
  [[ ! -L $SUS_ANALYTICS_AUTH_FILE ]] || die 'Verificador local inválido.'
  mv -T -- "$pending_auth" "$SUS_ANALYTICS_AUTH_FILE"
  owned_auth="$SUS_ANALYTICS_AUTH_FILE"
fi
pending_auth=

password_file="$SUS_ANALYTICS_STATE_DIR/pec-password"
[[ ! -L $password_file ]] || die 'A senha do PEC precisa estar em um arquivo local regular.'
[[ ! -e $password_file || ( -f $password_file && -O $password_file && $(stat -c %a -- "$password_file") == 600 ) ]] ||
  die 'A senha do PEC precisa pertencer ao operador com modo 0600.'
if [[ ! -s $password_file ]]; then
  ( set -o noclobber; openssl rand -hex 32 >"$password_file" )
fi
read -r db_password <"$password_file"
[[ $db_password =~ ^[0-9a-f]{64}$ ]] || die 'A configuração privada do PEC é inválida.'

# Restrict the application role to the relations used by the local panel.
mapfile -t tables < <(rg -o --no-filename '\b(tb|ta|rl)_[a-z0-9_]+' apps/backend/local -g '*.ts' -g '!*.test.ts' | sort -u)
(( ${#tables[@]} > 0 )) || die 'Nenhuma relação PEC foi identificada nas consultas locais.'
{
  printf "\\set password '%s'\n" "$db_password"
  cat <<'SQL'
BEGIN READ WRITE;
SELECT pg_advisory_xact_lock(1984132054);
DO $role$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'sus_analytics_web_anton254'
    AND shobj_description(oid, 'pg_authid') IS DISTINCT FROM 'DM Saúde SUS Analytics Web on Anton-254'
  ) THEN
    RAISE EXCEPTION 'A conta PEC já existe e pertence a outra instalação';
  END IF;
END
$role$;
SELECT format(
  'CREATE ROLE sus_analytics_web_anton254 LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT CONNECTION LIMIT 4 PASSWORD %L',
  :'password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sus_analytics_web_anton254') \gexec
COMMENT ON ROLE sus_analytics_web_anton254 IS 'DM Saúde SUS Analytics Web on Anton-254';
ALTER ROLE sus_analytics_web_anton254 IN DATABASE esus SET default_transaction_read_only = on;
GRANT CONNECT ON DATABASE esus TO sus_analytics_web_anton254;
GRANT USAGE ON SCHEMA public TO sus_analytics_web_anton254;
SQL
  for table in "${tables[@]}"; do
    printf "SELECT 'GRANT SELECT ON TABLE public.%s TO sus_analytics_web_anton254' WHERE to_regclass('public.%s') IS NOT NULL \\gexec\n" "$table" "$table"
  done
  cat <<'SQL'
DO $permissions$
BEGIN
  -- PostgreSQL 9.6 has a public schema grant shared by other local clients.
  -- The application executes every source query in a read-only transaction.
  IF has_database_privilege('sus_analytics_web_anton254', 'esus', 'CREATE') THEN
    RAISE EXCEPTION 'A conta do painel pode criar schemas na cópia PEC. Revise as concessões com o responsável pelo banco.';
  END IF;
END
$permissions$;
COMMIT;
SQL
} | docker exec -i "$pec" psql -X -U postgres -d esus -qAt -v ON_ERROR_STOP=1 >/dev/null
unset db_password

mapfile -d '' -t files < <(
  git ls-files -z --cached --others --exclude-standard -- \
    .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json patches \
    apps/agente_local/package.json apps/backend/local apps/frontend shared \
    docker/vite.pec-local.ts docker/tsconfig.pec-local.json ':(exclude,glob)**/.env*' | sort -zu
)
fingerprint=$(
  { printf '%s\n' "$image_id"; printf '%s\0' "${files[@]}" | xargs -0 sha256sum; } |
    sha256sum | cut -c 1-20
)
export SUS_ANALYTICS_APP_VOLUME="$project_name-release-$fingerprint"
compose=(docker compose -f docker/compose.yml)
previous_address=$("${compose[@]}" port app 3000 2>/dev/null || :)
previous_port=${previous_address##*:}

if ! docker volume inspect "$SUS_ANALYTICS_APP_VOLUME" >/dev/null 2>&1; then
  exec 9>"${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/dm-workspace-build.lock"
  flock --exclusive 9
  available=$(df -B1 --output=avail / | tail -1)
  # The Node image is already local. A cold install of this lockfile and the
  # compiled app fit within a 2 GiB peak, including the disposable pnpm store.
  (( available >= 66 * 1024 * 1024 * 1024 )) ||
    die 'Espaço insuficiente para manter a reserva de 64 GiB e o pico de 2 GiB.'
  docker volume create --label "com.dm.application=$project_name" --label com.dm.purpose=pec-runtime "$SUS_ANALYTICS_APP_VOLUME" >/dev/null
  owned_release=true
  build_cache="$project_name-build-cache-$$"
  docker volume create --label "com.dm.application=$project_name" --label com.dm.purpose=disposable-build-cache "$build_cache" >/dev/null
  printf '%s\n' 'Compilando o painel PEC dentro do Docker.'
  printf '%s\0' "${files[@]}" | tar --null -T - -cf - | docker run --rm -i --pull never \
    --label "com.dm.application=$project_name" \
    --mount "type=volume,source=$SUS_ANALYTICS_APP_VOLUME,target=/app,volume-nocopy" \
    --mount "type=volume,source=$build_cache,target=/cache,volume-nocopy" \
    --env HOME=/cache --env COREPACK_HOME=/cache/corepack \
    --workdir /app "$image" sh -euc '
      umask 022
      tar -xf -
      corepack pnpm install --frozen-lockfile --reporter=append-only --store-dir=/cache/pnpm --package-import-method=copy
      corepack pnpm exec tsc -p docker/tsconfig.pec-local.json
      corepack pnpm exec vite build --config docker/vite.pec-local.ts
      corepack pnpm exec esbuild apps/backend/local/index.ts --bundle --packages=external --platform=node --format=esm --outfile=dist/pec-local.js
      test -s dist/public/index.html
    '
  docker volume rm "$build_cache" >/dev/null
  build_cache=
  flock --unlock 9
else
  [[ $(docker volume inspect "$SUS_ANALYTICS_APP_VOLUME" --format '{{index .Labels "com.dm.purpose"}}') == pec-runtime ]] ||
    die 'O volume calculado pertence a outro serviço.'
  docker run --rm --pull never --network none \
    --mount "type=volume,source=$SUS_ANALYTICS_APP_VOLUME,target=/app,readonly" \
    "$image" sh -euc 'test -s /app/dist/pec-local.js && test -s /app/dist/public/index.html' ||
    die 'O volume existente não contém uma compilação utilizável.'
fi

legacy_container=sus-analytics-web-app-1
legacy_active=false
legacy_identity=$(docker inspect "$legacy_container" --format '{{index .Config.Labels "com.docker.compose.project"}}|{{index .Config.Labels "com.docker.compose.project.config_files"}}|{{.State.Running}}' 2>/dev/null || :)
if [[ $legacy_identity == "sus-analytics-web|$PWD/docker/compose.yml|true" ]]; then
  docker stop "$legacy_container" >/dev/null
  legacy_active=true
fi

if ! "${compose[@]}" up -d --wait --wait-timeout 85; then
  if [[ $previous =~ ^sus-analytics-web-anton254-release-[0-9a-f]{20}$ && -r $previous_auth ]] &&
      docker volume inspect "$previous" >/dev/null 2>&1; then
    SUS_ANALYTICS_PORT="${previous_port:-${SUS_ANALYTICS_PORT:-}}" \
      SUS_ANALYTICS_APP_VOLUME="$previous" SUS_ANALYTICS_AUTH_FILE="$previous_auth" "${compose[@]}" up -d --wait --wait-timeout 85 ||
      printf '%s\n' 'A versão anterior também ficou indisponível.' >&2
  elif [[ $previous != "$SUS_ANALYTICS_APP_VOLUME" ]]; then
    "${compose[@]}" rm --stop --force app
    if $legacy_active; then docker start "$legacy_container" >/dev/null; fi
  fi
  die 'A aplicação não confirmou a conexão com o PEC local.'
fi
owned_release=false
owned_auth=
deployment_record=$(mktemp -- "$SUS_ANALYTICS_STATE_DIR/.active-release-XXXXXXXX")
printf '%s\n%s\n' "$SUS_ANALYTICS_APP_VOLUME" "$SUS_ANALYTICS_AUTH_FILE" >"$deployment_record"
mv -T -- "$deployment_record" "$previous_release"
deployment_record=

if [[ $previous =~ ^sus-analytics-web-anton254-release-[0-9a-f]{20}$ && $previous != "$SUS_ANALYTICS_APP_VOLUME" ]] &&
   [[ $(docker volume inspect "$previous" --format '{{index .Labels "com.dm.purpose"}}' 2>/dev/null || :) == pec-runtime ]]; then
  if ! docker volume rm "$previous" >/dev/null 2>&1; then
    printf '%s\n' 'O volume anterior foi preservado. A versão atual está ativa.' >&2
  fi
fi
if [[ $previous_auth == "$SUS_ANALYTICS_STATE_DIR"/superadmin-*.json && $previous_auth != "$SUS_ANALYTICS_AUTH_FILE" ]]; then
  rm -f -- "$previous_auth"
fi
address=$("${compose[@]}" port app 3000)
printf 'Aplicação: http://%s/login\n' "$address"
