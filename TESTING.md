# Manual Testing Checklist

## Prerequisites
- A Mastodon account with access token (generate in Settings → Development)
- Local dev server running (`npm run dev`)

## Tests

1. **Settings Persistence**
   - [ ] Enter instance URL (e.g., `mastodon.social`)
   - [ ] Enter access token
   - [ ] Click "Save Settings"
   - [ ] See "Settings saved!" success message
   - [ ] Reload page
   - [ ] Verify fields are pre-populated

2. **Character Counter**
   - [ ] Type in textarea
   - [ ] Verify counter updates (e.g., `10/500`)
   - [ ] Verify button is enabled when text > 0
   - [ ] Verify button is disabled when empty

3. **Post a Toot** (requires real token)
   - [ ] Enter valid instance and token
   - [ ] Type a toot
   - [ ] Click "Toot!"
   - [ ] See success message with link to toot
   - [ ] Click link to verify toot was posted

4. **Error Handling**
   - [ ] Enter invalid token
   - [ ] Try to post
   - [ ] Verify error message appears
   - [ ] Enter text > 500 chars
   - [ ] Verify button is disabled
