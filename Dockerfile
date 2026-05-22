FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY server.mjs ./server.mjs
COPY data-source.mjs ./data-source.mjs

EXPOSE 80

CMD ["node", "server.mjs"]
