#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
[[ -z ${DOCKER_HOST:-} && $(docker context show) == default ]]
runtime=${SUS_ANALYTICS_DEPS_VOLUME:-$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Name}}{{end}}{{end}}' sus-analytics-web-anton254-app-1)}
docker volume inspect "$runtime" >/dev/null
available=$(df -B1 --output=avail / | tail -1)
# Images and dependencies already exist. The build and database write to tmpfs.
(( available >= 66 * 1024 * 1024 * 1024 )) || { echo "O gate exige 64 GiB de reserva e 2 GiB de pico no Kingston." >&2; exit 1; }

job="sus-analytics-web-qa-$$"
database="$job-db"
fixture_password=$(openssl rand -hex 24)
docker network create --internal "$job" >/dev/null
cleanup() {
  for resource in "$job-app" "$database"; do
    if docker container inspect "$resource" >/dev/null 2>&1; then docker rm --force "$resource" >/dev/null; fi
  done
  docker network rm "$job" >/dev/null
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
docker run --rm --detach --pull never --name "$database" --network "$job" --network-alias fixture-pec \
  --cpus 1 --memory 256m --tmpfs /var/lib/postgresql/data \
  -e POSTGRES_DB=esus -e "POSTGRES_PASSWORD=$fixture_password" postgres:9.6.24 >/dev/null
for (( attempt=1; attempt<=30; attempt++ )); do
  if docker exec "$database" pg_isready -h 127.0.0.1 -U postgres -d esus >/dev/null; then break; fi
  sleep 1
done
docker exec -i "$database" psql -X -U postgres -d esus -q -v ON_ERROR_STOP=1 -v "fixture_password=$fixture_password" < docker/qa/pec-local.sql

git ls-files -z --cached --others --exclude-standard -- package.json pnpm-lock.yaml tsconfig.json \
  vite.config.ts vitest.config.ts drizzle apps shared docker/tsconfig.pec-local.json \
  docker/vite.pec-local.ts docker/qa/pec-local.mjs ':(exclude,glob)**/.env*' |
  sort -zu | tar --null -T - -cf - |
  docker run --rm -i --pull never --name "$job-app" --network "$job" --cpus 2 --memory 3g --shm-size 256m \
    --mount "type=volume,source=$runtime,target=/deps,readonly" \
    --tmpfs /work:exec,size=2300m --tmpfs /run/secrets --tmpfs /run/b360 -w /work \
    -e "SUS_FIXTURE_PEC_PASSWORD=$fixture_password" -e SUS_PEC_HOST=fixture-pec -e SUS_PEC_DATABASE=esus \
    -e SUS_PEC_USER=sus_analytics_web_anton254 \
    mcr.microsoft.com/playwright:v1.59.1-noble sh -euc '
      tar -xf -
      cmp -s pnpm-lock.yaml /deps/pnpm-lock.yaml || { echo "Dependências do volume diferem do lockfile." >&2; exit 1; }
      printf "SHA256 dos arquivos exercitados: "
      find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum
      mkdir node_modules
      for dep in /deps/node_modules/* /deps/node_modules/.bin; do ln -s "$dep" node_modules/; done
      ./node_modules/.bin/tsc -p docker/tsconfig.pec-local.json --incremental false
      ./node_modules/.bin/vitest run
      ./node_modules/.bin/vite build --config docker/vite.pec-local.ts
      ./node_modules/.bin/esbuild apps/backend/local/index.ts --bundle --packages=external --platform=node --format=esm --outfile=dist/pec-local.js
      node docker/qa/pec-local.mjs
    '
