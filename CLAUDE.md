# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**cf-say** - A Cloudflare Pages application that provides a web interface for posting to Mastodon instances. Uses Cloudflare Functions as an API proxy to bypass CORS.

## Commands

```bash
npm run dev      # Start local dev server (Wrangler Pages)
npm run deploy   # Deploy to Cloudflare Pages
```

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────┐
│   User Browser  │────▶│ Cloudflare Pages     │────▶│ Mastodon Instance │
│  (localStorage) │     │ - Static Frontend    │     │ - API v1/statuses │
│                 │     │ - Functions Proxy    │     │                   │
└─────────────────┘     └──────────────────────┘     └───────────────────┘
```

**File Structure:**
- `public/index.html` - Single-page app with embedded CSS/JS
- `functions/api/toot.ts` - Cloudflare Function (API proxy)
- `wrangler.toml` - Cloudflare config
- `tsconfig.json` - TypeScript config for Functions

## Data Flow

1. User configures Mastodon instance + token → stored in `localStorage`
2. User submits toot → POST `/api/toot` with instance/token/status/visibility
3. Function forwards to `https://{instance}/api/v1/statuses`
4. Response returned to frontend

## Testing

No automated tests. Manual testing checklist in `TESTING.md`. Requires a real Mastodon account with API token for testing.
