# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app
ENV DATABASE_URL="file:./data/build.db"
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime stage ----
FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production NODE_OPTIONS=
COPY --from=build /app /app
RUN chmod +x /app/scripts/docker-entrypoint.sh && mkdir -p /app/prisma/data
EXPOSE 3000
# SQLite file persists via a volume at /app/prisma/data (see README)
CMD ["sh", "scripts/docker-entrypoint.sh"]
