FROM node:26.0.0 AS build

WORKDIR /app

RUN npm install -g pnpm@11.1.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:26.0.0-alpine

WORKDIR /app

COPY --from=build /app/dist /app/dist

CMD ["node", "/app/dist/chat-ai-frontend/server/server.mjs"]
