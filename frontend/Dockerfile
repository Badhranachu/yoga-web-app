# Production image only. Local development continues to use `npm run dev`.
FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage -------------------------------------------------
# Static files served by nginx only. No Node.js, npm, npx, or vite is
# installed here or present at container runtime — `vite preview` is a
# dev-server process (it needs Node running continuously and pulls in
# devDependencies like vite itself), never the right tool for serving a
# production build. dist/ is plain static output; nginx is what
# actually belongs in front of it.
FROM nginx:1.27-alpine AS run

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# nginx:alpine's own base image already runs worker processes as the
# unprivileged `nginx` user (set in the stock /etc/nginx/nginx.conf,
# which this Dockerfile doesn't touch) — only the master process stays
# root, which is required to bind port 80. Nothing further to drop here.

# wget is part of alpine's busybox and is already present in this image
# — no curl/node needed for the healthcheck.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
