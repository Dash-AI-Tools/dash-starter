# Build context is the repository root so npm workspaces resolve.
FROM node:24.22.1-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspace @dash/web --include-workspace-root
COPY apps/web ./apps/web
# Vite inlines the flag at build time: demo mode shows the palette picker.
ARG VITE_DEMO_MODE=false
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
RUN cd apps/web && npm run build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
