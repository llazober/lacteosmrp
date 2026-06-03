# Stage 1: Build the NestJS app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# Stage 2: Final runtime image
FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Script de inicio que sincroniza el esquema con PostgreSQL y luego arranca el servidor NestJS
CMD ["sh", "-c", "npx prisma db push && node dist/src/main.js"]
