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
- Uses `GTIMES_WEBHOOK_SECRET` (set and matched in both `.env` files ✅)

Upload dirs: `articles`, `events`, `gallery`, `avatars`, `videos`

---

## Current Status
**Live at `gtimes.in`** — fully deployed, content loaded, webhook active.

All major development and configuration is complete. No known open bugs.

---

## Last Session (2026-08-15)

### Fixes & Features
- **OG image fix** — `og:image` always emitted; cover image if present, else `/images/default-cover.jpg` fallback. Added `og:image:width/height`. JSON-LD `image` also always set.
- **Image protection** — right-click disabled (JS), iOS long-press blocked (CSS), drag blocked (CSS), footer copyright notice added.
- **Bento inline gallery** — replaces plain grid in articles: 1 big + 4 uniform squares + `+N` overflow, lightbox browses all photos with counter.
- **Webhook delete fix** — `deleteArticle`, `unpublishArticle`, `deleteEvent` now all call `notifyGreenwood` so GHS deactivates content when removed from GTimes.
- **GHS cleanup** — manually deactivated the sample test article (gtimes_id=4) from GHS database via phpMyAdmin.
- **Content & secrets** — client-provided logo, favicon, about text, social handles, default cover image all set. `GTIMES_WEBHOOK_SECRET` matched in both `.env` files.

### Commits (2026-08-15)
| Hash | Description |
|---|---|
| `5d34138` | fix: always emit og:image with fallback |
| `bae7520` | feat: right-click disable + footer copyright |
| `13e4793` | feat: bento inline gallery in articles |
| `2463219` | docs: update MEMORY.md and todo.md |
| `a30c4f4` | fix: notify GHS on article unpublish/delete and event delete |
| `4566bfa` | fix: move cover image to top of article, share galleries across language tabs |

### Additional fixes (same session)
- **Cover image to top** — moved from `<aside>` to inside `<article>`, right after title/meta and before language toggle. Uses existing `.gt-article-cover` class. Works correctly on both desktop and mobile.
- **Gallery in Hindi/Telugu** — new `injectMissingGalleries(rawEn, transContent)` helper in `mainController.js`. Before `processInlineGalleries()` runs on translations, it copies any `gt-inline-gallery` embed tags from the raw English content into translations that don't already have them. Galleries are language-neutral; they now appear in all language tabs automatically without the admin needing to insert the embed in each Quill tab manually.

---

## Key Files
| File | Purpose |
|---|---|
| `app.js` | Express app entry |
| `routes/main.js` | Public site routes |
| `routes/admin.js` | Admin panel routes |
| `routes/api.js` | Webhook endpoint |
| `controllers/adminController.js` | Admin actions + `notifyGreenwood()` |
| `controllers/mainController.js` | Public pages + `processInlineGalleries()` |
| `public/css/main.css` | All site styles incl. bento gallery |
| `public/js/main.js` | Lightbox (album + bento), nav, videos |
| `views/main/article.ejs` | Article page — OG tags, lightbox HTML |
| `views/partials/footer.ejs` | Footer — copyright notice |
