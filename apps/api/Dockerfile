# Build context is the repository root so npm workspaces resolve.
FROM node:24.22.1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace @dash/api --include-workspace-root

FROM deps AS build
COPY apps/api ./apps/api
RUN cd apps/api && node ace build

FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --omit=dev --workspace @dash/api --include-workspace-root

FROM base
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/build ./
EXPOSE 3333
CMD ["node", "bin/server.js"]
