# AGENTS.md

## Architecture

- Angular 22 frontend (zoneless) with SSR via Express (`server.ts`).
- Single-route app: lazy-loaded `ChatPageComponent` at `/chat`, catch-all redirects to `/chat`.
- Backend is a **separate repo** (`chat-ai-backend`). Fronted talks to it over WebSocket (ngx-socket-io).
- Firebase Auth is used for login.
- i18n via `@ngx-translate/core`, JSON files under `src/assets/i18n/`.

## Package Manager

- Use **pnpm** (v11.1.1). `package.json` has `"packageManager": "pnpm@11.1.1"`. All commands from here on use `pnpm` instead of `npm`.

## Commands

```bash
pnpm dev          # ng serve --no-hmr (port 4200)
pnpm build        # ng build (SSR output to dist/chat-ai-frontend)
pnpm test         # ng test (Karma + Jasmine)
```

- No lint or format scripts configured.
- `npm start` is not defined in the project — it was the legacy start command. Use `npm run dev` for local dev and `npm run serve:ssr:chat-ai-frontend` for SSR prod.

## Environment & Config

- Environment file is misspelled: `src/environments/environtment.ts` (not `environment.ts`). All imports must use this exact path.
- `environtment.ts` (dev) — socket URL: `http://localhost:3002`
- `environtment.prod.ts` — socket URL: `https://chat-ai-backend.dclavijo45.dev`
- SSR port is **4002** (set in `server.ts`). Dev server port is **4200**.

## Key Dependencies

- `ngx-markdown` (marked) for markdown rendering + `prismjs` for code highlighting.
- `@ngneat/dialog`, `@ngneat/helipopper` (tippy.js), `@perfectmemory/ngx-contextmenu`, `simple-notify`.
- `ngx-socket-io` — socket connects manually (autoConnect: false), then pings every 10s.
- `@angular/cdk@22` required by `@perfectmemory/ngx-contextmenu` (not a direct dependency; must be installed explicitly).

## Conventions

- SCSS for styles. 4-space indent, single quotes for TypeScript (`.editorconfig`).
- Inject token in constructor rather than `inject()` in field initializer (see `AppComponent`, `SocketService`, `TranslateConfigService`).
- Components are standalone (no NgModules).
- Templates use block control flow (`@if`, `@for`, `@else`) — no `*ngIf` / `*ngFor`.
