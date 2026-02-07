FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# prisma.config.ts requires DATABASE_URL; use a placeholder for generate (no DB connection needed)
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

ENTRYPOINT ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
