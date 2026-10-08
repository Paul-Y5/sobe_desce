FROM node:24.21.0-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN npm ci --no-audit --no-fund

FROM dependencies AS server-build
COPY tsconfig.json ./
COPY shared shared
COPY server server
RUN npm run build:server

FROM dependencies AS web-build
COPY tsconfig.json ./
COPY shared shared
COPY client client
ENV EXPO_PUBLIC_SERVER_URL=same-origin CI=1 EXPO_OFFLINE=1
RUN npm run build:web

FROM node:24.21.0-bookworm-slim AS server-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN npm ci --omit=dev --workspace=server --include-workspace-root=false --ignore-scripts --no-audit --no-fund

FROM node:24.21.0-bookworm-slim AS server
ARG APP_VERSION=local
LABEL org.opencontainers.image.title="Sobe e Desce server" org.opencontainers.image.version=$APP_VERSION
WORKDIR /app
COPY --from=server-dependencies /app/ ./
COPY --from=server-build /app/server/dist ./server/dist
RUN mkdir /data && chown node:node /data
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001 ACCOUNT_DATABASE=/data/accounts.sqlite
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 CMD ["node", "-e", "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server/dist/server/index.js"]

FROM nginx:1.30.4-alpine AS web
ARG APP_VERSION=local
LABEL org.opencontainers.image.title="Sobe e Desce web" org.opencontainers.image.version=$APP_VERSION
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=web-build /app/client/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=5 CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/health"]
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
