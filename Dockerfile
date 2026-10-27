# Review/pin an immutable image digest before any deployment is authorized.
FROM node:24.14.1-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_CLERK_ACCOUNT_PORTAL_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_CLERK_ACCOUNT_PORTAL_URL=$VITE_CLERK_ACCOUNT_PORTAL_URL VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN npm run check && npm run build
FROM node:24.14.1-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Runtime still imports Vite/theme utilities. Keep locked dev dependencies until that import split is qualified.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/shared ./shared
COPY --from=build --chown=node:node /app/staging ./staging
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
STOPSIGNAL SIGTERM
CMD ["sh", "scripts/start-railway.sh"]
