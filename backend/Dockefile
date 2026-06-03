# --- STAGE 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npx tsc prisma/seed.ts --module commonjs --target es2020 --esModuleInterop --skipLibCheck
RUN npm run build

# --- STAGE 2: Run ---
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma/seed.js ./prisma/seed.js
RUN npx prisma generate
EXPOSE 3000

# Run prisma db push before starting the server to ensure tables exist
CMD ["sh", "-c", "npx prisma db push && npm run start:prod"]
