# syntax=docker/dockerfile:1@sha256:572cebbc2b15e6f84c077742952674889cb63cd5e9b80abdffcbe587b6f19183
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

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:675c532423b908f9e56f9d60a4e62309b63cd2a3175acb90a46b96f7ee68e121 AS node_runtime

FROM gcr.io/distroless/base-nossl-debian13:nonroot@sha256:4006ac92504be607b70de01d1f64f38288c69fcd8faa820f6d3aed266ea32ac5
# Node includes its own OpenSSL. Preserve the shared GCC libraries and their package metadata.
COPY --parents --from=node_runtime \
    /nodejs/ \
    /usr/lib/*-linux-gnu/libgcc_s.so.1 /usr/lib/*-linux-gnu/libstdc++.so.6* \
    /var/lib/dpkg/status.d/libgcc-s1* /var/lib/dpkg/status.d/libstdc++6* \
    /usr/share/doc/libgcc-s1 /usr/share/doc/libstdc++6 /
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=65532:65532 /workspace/dist/ dist/
USER 65532:65532
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=4s --start-period=8s \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/healthz').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["--no-warnings", "dist/pec-local.js"]
