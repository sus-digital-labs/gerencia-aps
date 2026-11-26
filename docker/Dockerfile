FROM node:24-bookworm-slim AS build
WORKDIR /workspace
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY patches/ patches/
COPY apps/agente_local/package.json apps/agente_local/package.json
RUN corepack pnpm install --frozen-lockfile

COPY apps/backend/local/ apps/backend/local/
COPY apps/frontend/ apps/frontend/
COPY shared/ shared/
COPY docker/tsconfig.pec-local.json docker/vite.pec-local.ts docker/
RUN corepack pnpm check && corepack pnpm build

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:675c532423b908f9e56f9d60a4e62309b63cd2a3175acb90a46b96f7ee68e121
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=65532:65532 /workspace/dist/ dist/
USER 65532:65532
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=4s --start-period=8s \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/healthz').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]
CMD ["--no-warnings", "dist/pec-local.js"]
