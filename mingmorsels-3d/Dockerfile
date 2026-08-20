# Multi-Stage Dockerfile for mingmorsels Enterprise Application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/db.js ./db.js
COPY --from=builder /app/redis.js ./redis.js
COPY --from=builder /app/data_store.json ./data_store.json

ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=4s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5001/api/health || exit 1

CMD ["node", "server.js"]
