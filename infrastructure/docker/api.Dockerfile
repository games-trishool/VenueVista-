# Build from the repository root; never copy local secrets into the build context.
FROM node:24-bookworm-slim AS build
WORKDIR /app
# Node24 fetch/Corepack must honor the operator-provided HTTPS proxy during builds.
# TLS and Corepack package-signature verification remain enabled.
ENV NODE_USE_ENV_PROXY=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY . .
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    pnpm install --frozen-lockfile
RUN pnpm db:generate && pnpm --filter @venuevista/api build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=4000
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/main.js"]

