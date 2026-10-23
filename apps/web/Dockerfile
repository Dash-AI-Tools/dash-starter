# Build context is the repository root so npm workspaces resolve.
FROM node:24.22.1-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
# The UI kit is a workspace the app imports as source. Only its runtime
# dependencies are installed, and only the bundle of the app ships.
COPY packages/ui/package.json ./packages/ui/
# The typed client of the app reads its types from the API workspace, so the
# build installs and copies it too; none of it reaches the final image.
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace @dash/web --workspace @dash/api --include-workspace-root
COPY packages/ui ./packages/ui
COPY apps/api ./apps/api
COPY apps/web ./apps/web
# Vite inlines the flag at build time: demo mode shows the palette picker.
ARG VITE_DEMO_MODE=false
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
RUN cd apps/web && npm run build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
