FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY backend-nest/package*.json ./

RUN npm install

COPY backend-nest/ .
COPY prisma /app/prisma

RUN npx prisma generate --schema /app/prisma/schema.prisma
RUN npm run build

EXPOSE 5001

CMD ["npm", "run", "dev"]
