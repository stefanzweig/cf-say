# Mastodon Poster - Design Specification

**Date:** 2026-04-01
**Project:** cf-say (Cloudflare Pages Mastodon Poster)

## Overview

A minimal Mastodon posting client hosted on Cloudflare Pages. Users can configure their Mastodon instance and access token, then submit toots through a simple web interface. All API calls are proxied through Cloudflare Functions to bypass CORS and local network restrictions.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌───────────────────┐
│   User Browser  │────▶│ Cloudflare Pages     │────▶│ Mastodon Instance │
│                 │     │ - Static Frontend    │     │ - API v1/statuses │
│ - localStorage  │     │ - Functions Proxy    │     │                   │
└─────────────────┘     └──────────────────────┘     └───────────────────┘
```

## Components

### 1. Frontend (Static)

**File:** `public/index.html`

A single-page application with:

- **Settings Section**
  - Instance URL input (e.g., `mastodon.social`)
  - Access Token input (sensitive, masked)
  - Save button → stores to localStorage

- **Posting Section**
  - Textarea for toot content
  - Character counter (0/500)
  - Visibility selector: `public` | `unlisted` | `private`
  - Submit button (disabled if over 500 chars or empty)

- **Status/Feedback Area**
  - Success message with link to toot
  - Error messages for network/auth failures

### 2. API Proxy (Cloudflare Function)

**File:** `functions/api/toot.ts`

A POST endpoint that:
- Reads `instance` and `token` from request body (or resolves from session)
- Forwards POST to `https://{instance}/api/v1/statuses`
- Returns the API response to the client

**Request Body:**
```json
{
  "instance": "mastodon.social",
  "token": "user_access_token",
  "status": "Toot content here",
  "visibility": "public"
}
```

### 3. Data Storage

**localStorage keys:**
- `mastodon-instance` - Instance domain (e.g., `mastodon.social`)
- `mastodon-token` - Access token

## Data Flow

1. User loads page → reads localStorage → populates settings fields if saved
2. User enters toot → character counter updates
3. User clicks Submit → POST `/api/toot` with instance, token, status, visibility
4. Cloudflare Function forwards to Mastodon API
5. Response displayed to user

## Error Handling

| Error Type | Frontend Behavior |
|------------|-------------------|
| Network error | Show "Network error, please try again" |
| 401 Unauthorized | Show "Invalid token, please check settings" |
| 422 Validation | Show error message from API |
| 5xx Server | Show "Service unavailable, try again later" |

## Testing Strategy

- Manual testing against a real Mastodon instance
- Verify character limit enforcement
- Verify visibility settings work correctly
- Verify token validation

## Future Considerations (Out of Scope)

- Media attachments
- Content warnings
- Thread/reply support
- Timeline viewing
- Multi-account support

---

## Files to Create

```
cf-say/
├── public/
│   └── index.html          # Frontend UI
├── functions/
│   └── api/
│       └── toot.ts         # API proxy function
├── package.json            # Dependencies
├── wrangler.toml           # Cloudflare config
└── docs/
    └── superpowers/specs/
        └── 2026-04-01-mastodon-poster-design.md
```
