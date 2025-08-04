FROM node:24.0.0 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:24.0.0-alpine

WORKDIR /app

COPY --from=build /app/dist /app/dist

CMD ["node", "/app/dist/chat-ai-frontend/server/server.mjs"]
