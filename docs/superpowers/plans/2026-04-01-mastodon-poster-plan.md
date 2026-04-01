# Mastodon Poster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Cloudflare Pages application that proxies Mastodon API requests, allowing users to post toots via a web interface with instance/token configuration.

**Architecture:** Static frontend (HTML/CSS/JS) served by Cloudflare Pages, with a serverless Function acting as an API proxy to forward requests to configured Mastodon instances.

**Tech Stack:** Cloudflare Pages, Cloudflare Functions (TypeScript), vanilla JavaScript, localStorage for client-side configuration.

---

## File Structure

```
cf-say/
├── public/
│   └── index.html          # Frontend UI (HTML + embedded CSS/JS)
├── functions/
│   └── api/
│       └── toot.ts         # API proxy function
├── package.json            # Dependencies (wrangler, typescript)
├── wrangler.toml           # Cloudflare Workers config
├── tsconfig.json           # TypeScript config
└── docs/
    ├── superpowers/specs/
    │   └── 2026-04-01-mastodon-poster-design.md
    └── superpowers/plans/
        └── 2026-04-01-mastodon-poster-plan.md
```

---

## Tasks

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `wrangler.toml`
- Create: `tsconfig.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "cf-say",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler pages dev public",
    "deploy": "wrangler pages deploy public"
  },
  "devDependencies": {
    "wrangler": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create wrangler.toml**

```toml
name = "cf-say"
compatibility_date = "2026-04-01"
pages_build_output_dir = "./public"

[vars]
# No environment variables needed - instance/token come from request body
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2021"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noImplicitAny": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["functions/**/*.ts"]
}
```

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

Expected: node_modules created with wrangler and typescript

- [ ] **Step 5: Commit**

```bash
git add package.json wrangler.toml tsconfig.json
git commit -m "chore: initial project setup with wrangler config"
```

---

### Task 2: API Proxy Function

**Files:**
- Create: `functions/api/toot.ts`

- [ ] **Step 1: Write the API proxy function**

```typescript
interface ToRequest {
  instance: string;
  token: string;
  status: string;
  visibility: 'public' | 'unlisted' | 'private';
}

export async function onRequestPost({ request }: { request: Request }): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body: ToRequest = await request.json();

    // Validate required fields
    if (!body.instance || !body.token || !body.status) {
      return Response.json(
        { error: 'Missing required fields: instance, token, status' },
        { status: 400, headers }
      );
    }

    // Validate visibility
    const validVisibilities = ['public', 'unlisted', 'private'];
    if (body.visibility && !validVisibilities.includes(body.visibility)) {
      return Response.json(
        { error: 'Invalid visibility. Must be one of: public, unlisted, private' },
        { status: 400, headers }
      );
    }

    // Build Mastodon API URL
    const url = `https://${body.instance}/api/v1/statuses`;

    // Forward request to Mastodon
    const mastodonResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${body.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: body.status,
        visibility: body.visibility || 'public',
      }),
    });

    const responseData = await mastodonResponse.json();

    if (!mastodonResponse.ok) {
      return Response.json(
        { error: responseData.error || 'Failed to post toot' },
        { status: mastodonResponse.status, headers }
      );
    }

    return Response.json(responseData, { headers });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: `Proxy error: ${errorMessage}` },
      { status: 500, headers }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/api/toot.ts
git commit -m "feat: add API proxy function for Mastodon toots"
```

---

### Task 3: Frontend HTML Structure

**Files:**
- Create: `public/index.html`

- [ ] **Step 1: Create the frontend HTML with embedded CSS and JavaScript**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mastodon Poster</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
      color: #6366f1;
    }
    .card {
      background: #16213e;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
    .card h2 {
      font-size: 1.2rem;
      margin-bottom: 15px;
      color: #6366f1;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-size: 0.9rem;
      color: #aaa;
    }
    input, textarea, select {
      width: 100%;
      padding: 12px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #0f0f23;
      color: #eee;
      font-size: 1rem;
      margin-bottom: 15px;
    }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #6366f1;
    }
    textarea {
      min-height: 150px;
      resize: vertical;
    }
    .char-counter {
      text-align: right;
      font-size: 0.85rem;
      color: #888;
      margin-top: -10px;
      margin-bottom: 15px;
    }
    .char-counter.warning {
      color: #f59e0b;
    }
    .char-counter.error {
      color: #ef4444;
    }
    button {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-primary {
      background: #6366f1;
      color: white;
    }
    .btn-primary:not(:disabled):hover {
      background: #4f46e5;
    }
    .status {
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
      display: none;
    }
    .status.success {
      background: #064e3b;
      border: 1px solid #059669;
      display: block;
    }
    .status.error {
      background: #450a0a;
      border: 1px solid #dc2626;
      display: block;
    }
    .status a {
      color: #6ee7b7;
      text-decoration: underline;
    }
    .row {
      display: flex;
      gap: 15px;
    }
    .row > * {
      flex: 1;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Mastodon Poster</h1>

    <!-- Settings Card -->
    <div class="card">
      <h2>Instance Settings</h2>
      <label for="instance">Mastodon Instance</label>
      <input type="text" id="instance" placeholder="mastodon.social">

      <label for="token">Access Token</label>
      <input type="password" id="token" placeholder="Generate in Settings → Development">

      <button class="btn-primary" onclick="saveSettings()">Save Settings</button>
    </div>

    <!-- Posting Card -->
    <div class="card">
      <h2>Create Toot</h2>
      <label for="status">What's happening?</label>
      <textarea id="status" placeholder="What's on your mind?" maxlength="600"></textarea>
      <div class="char-counter" id="charCounter">0/500</div>

      <label for="visibility">Visibility</label>
      <select id="visibility">
        <option value="public">Public - Show on public timeline</option>
        <option value="unlisted">Unlisted - Don't show on public timeline</option>
        <option value="private">Private - Only show to followers</option>
      </select>

      <button class="btn-primary" id="tootBtn" onclick="postToot()" disabled>Toot!</</button>

      <div class="status" id="status"></div>
    </div>
  </div>

  <script>
    const MAX_CHARS = 500;
    const STORAGE_KEYS = {
      INSTANCE: 'mastodon-instance',
      TOKEN: 'mastodon-token'
    };

    // DOM elements
    const instanceInput = document.getElementById('instance');
    const tokenInput = document.getElementById('token');
    const statusInput = document.getElementById('status');
    const charCounter = document.getElementById('charCounter');
    const visibilitySelect = document.getElementById('visibility');
    const tootBtn = document.getElementById('tootBtn');
    const statusDiv = document.getElementById('status');

    // Load saved settings on page load
    function loadSettings() {
      const savedInstance = localStorage.getItem(STORAGE_KEYS.INSTANCE);
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (savedInstance) instanceInput.value = savedInstance;
      if (savedToken) tokenInput.value = savedToken;
    }

    // Save settings to localStorage
    function saveSettings() {
      const instance = instanceInput.value.trim();
      const token = tokenInput.value.trim();

      if (!instance) {
        showStatus('Please enter an instance URL', 'error');
        return;
      }
      if (!token) {
        showStatus('Please enter an access token', 'error');
        return;
      }

      localStorage.setItem(STORAGE_KEYS.INSTANCE, instance);
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      showStatus('Settings saved!', 'success');
    }

    // Update character counter and button state
    function updateCharCounter() {
      const length = statusInput.value.length;
      charCounter.textContent = `${length}/${MAX_CHARS}`;

      charCounter.className = 'char-counter';
      if (length > MAX_CHARS) {
        charCounter.classList.add('error');
      } else if (length > MAX_CHARS - 50) {
        charCounter.classList.add('warning');
      }

      tootBtn.disabled = length === 0 || length > MAX_CHARS;
    }

    // Show status message
    function showStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.className = 'status ' + type;
    }

    // Post toot to Mastodon
    async function postToot() {
      const instance = localStorage.getItem(STORAGE_KEYS.INSTANCE);
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const status = statusInput.value.trim();
      const visibility = visibilitySelect.value;

      if (!instance || !token) {
        showStatus('Please configure instance settings first', 'error');
        return;
      }

      tootBtn.disabled = true;
      tootBtn.textContent = 'Posting...';

      try {
        const response = await fetch('/api/toot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instance,
            token,
            status,
            visibility
          })
        });

        const data = await response.json();

        if (response.ok) {
          showStatus(`Toot posted! View at: <a href="${data.url}" target="_blank">${data.url}</a>`, 'success');
          statusInput.value = '';
          updateCharCounter();
        } else {
          showStatus(`Error: ${data.error}`, 'error');
        }
      } catch (error) {
        showStatus(`Network error: ${error.message}`, 'error');
      } finally {
        tootBtn.disabled = false;
        tootBtn.textContent = 'Toot!';
      }
    }

    // Event listeners
    statusInput.addEventListener('input', updateCharCounter);
    loadSettings();
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/index.html
git commit -m "feat: add frontend UI with settings and posting interface"
```

---

### Task 4: Verify Development Setup

**Files:**
- None (verification task)

- [ ] **Step 1: Start development server**

```bash
npm run dev
```

Expected: Wrangler starts local dev server at http://localhost:8788

- [ ] **Step 2: Verify frontend loads**

Open browser to http://localhost:8788

Expected: See Mastodon Poster UI with settings and posting form

- [ ] **Step 3: Document manual testing steps**

Create a note in the spec document or a new TESTING.md:

```markdown
## Manual Testing Checklist

1. Configure instance and token in settings
2. Verify settings are saved (reload page)
3. Enter toot text, verify character counter updates
4. Verify button is disabled when empty or over 500 chars
5. Submit a toot, verify success message appears
6. Verify error handling with invalid token
```

- [ ] **Step 4: Commit any test documentation**

```bash
git add docs/
git commit -m "docs: add manual testing checklist"
```

---

## Verification Before Completion

- [ ] All TypeScript compiles without errors
- [ ] Development server starts successfully
- [ ] Frontend renders correctly
- [ ] API function is at correct path (`/api/toot`)
- [ ] All files committed to git
- [ ] Design spec referenced in comments or docs

---

## Testing Notes

Since this project relies on external Mastodon instances for testing, automated unit tests are not practical. The testing strategy focuses on:

1. **TypeScript strict mode** - Catches type errors at compile time
2. **Manual testing** - Against a real Mastodon instance
3. **Error handling verification** - Test with invalid tokens, network failures

If a test Mastodon instance is available (e.g., local development instance), integration tests could be added later.
