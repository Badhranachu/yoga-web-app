# Production image only. Local development continues to use `npm run dev`.
FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve the build with the project's own production command (vite preview) —
# no extra static-server dependency introduced.
FROM node:22-slim AS run

WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/vite.config.ts ./vite.config.ts

RUN addgroup --system app && adduser --system --ingroup app app \
    && chown -R app:app /app
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENV HOME=/home/app
ENV NPM_CONFIG_CACHE=/home/app/.npm

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]