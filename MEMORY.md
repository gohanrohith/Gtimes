# GTimes — Session Memory

**Client:** GTimes school newspaper (Virora International client)
**Repo:** `D:\gtimes`
**Type:** School media/news site — full end-to-end management by Virora

---

## Stack
| Layer | Detail |
|---|---|
| Framework | Node.js + Express.js |
| Templates | EJS |
| Database | MySQL |
| Session | express-session + MySQLStore |
| Port | 3001 |

## Run locally
```bash
npm run dev    # http://localhost:3001
```

---

## Integration with Greenwood
GTimes publishes articles/events → sends webhook to Greenwood:
- `POST /api/gtimes/sync` on Greenwood (rate limited)
- Uses `GTIMES_WEBHOOK_SECRET` (must match in both `.env` files)

Upload dirs: `articles`, `events`, `gallery`, `avatars`, `videos`

---

## Current Status
**Live at `gtimes.in`** — deployed and publicly accessible.

Open items:
- Content from client still pending (logo, favicon, about text, default cover image, social handles)
- Webhook secrets not yet matched between GTimes and Greenwood `.env` files
- End-to-end testing checklist not fully run

---

## Last Session (2026-08-15)

### Fixes & Features
- **OG image fix** — `og:image` and `twitter:image` now always emitted on article pages.
  Articles with cover image use it; articles without use `/images/default-cover.jpg` as fallback.
  Also added `og:image:width/height` hints. JSON-LD `image` field also always set.
- **Image protection** — right-click "Save Image As" disabled via JS contextmenu listener;
  iOS long-press save blocked via `-webkit-touch-callout: none` CSS;
  drag-to-desktop blocked via `-webkit-user-drag: none`.
- **Footer copyright** — added "All photographs and content… Unauthorised reproduction strictly prohibited."
- **Bento inline gallery** — replaced plain auto-fill grid with bento layout:
  1 big image (left) + up to 4 uniform squares (right); last square shows `+N` when album > 5 photos;
  all photos accessible via lightbox (counter shown); mobile collapses gracefully.
  Album page (`/gallery/:slug`) gallery is unchanged.

### Commits
| Hash | Description |
|---|---|
| `5d34138` | fix: always emit og:image with fallback |
| `bae7520` | feat: right-click disable + footer copyright |
| `13e4793` | feat: bento inline gallery in articles |

---

## Key Files
| File | Purpose |
|---|---|
| `app.js` | Express app entry |
| `routes/main.js` | Public site routes |
| `routes/admin.js` | Admin panel routes |
| `routes/api.js` | Webhook endpoint |
| `controllers/adminController.js` | Admin actions |
| `controllers/mainController.js` | Public pages + `processInlineGalleries()` |
| `public/css/main.css` | All site styles incl. bento gallery |
| `public/js/main.js` | Lightbox (album + bento), nav, videos |
| `views/main/article.ejs` | Article page — OG tags, lightbox HTML |
| `views/partials/footer.ejs` | Footer — copyright notice |
