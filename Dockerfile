# FROM node:18-alpine
# WORKDIR /usr/src/app
# COPY package*.json ./
# RUN npm install
# COPY . .
# EXPOSE 3000
# CMD ["npm", "start"]

# -------- BUILD STAGE --------
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

# -------- RUN STAGE --------
FROM node:20-alpine

# Patch OpenSSL CVEs (CVE-2025-15467, CVE-2026-31789)
RUN apk update && apk upgrade --no-cache libcrypto3 libssl3 && rm -rf /var/cache/apk/*

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app /app
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000
CMD ["npm", "start"]