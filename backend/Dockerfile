FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx prisma generate
EXPOSE 5000
CMD ["sh", "-c", "node scripts/upgrade-db.js && node src/server.js"]
