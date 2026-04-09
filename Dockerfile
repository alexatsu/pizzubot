FROM node:25-alpine3.22 AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

FROM node:25-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY --from=builder /app/node_modules ./node_modules
COPY . .
CMD ["sh", "-c", "pnpm deploy:db && pnpm start"]