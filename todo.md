# GTimes — Project TODO

## Status: Live at gtimes.in ✅

---

## 1. Content Needed From Client ⏳ PENDING

- [ ] **GTimes logo** (PNG + SVG) → `public/images/logo.png`
- [ ] **Favicon** → `public/favicon.ico` + `public/favicon.png` (512×512)
- [ ] **About page text** — tagline, mission statement, editorial team bio
- [ ] **Default cover image** (1200×630px) → `public/images/default-cover.jpg`
  ↳ Used as OG image fallback for articles without a cover — needed for WhatsApp previews
- [ ] **Social media handles** (Instagram, YouTube, Twitter/X) → set via admin Settings

---

## 2. Public Pages ✅ ALL DONE (13 pages)

- [x] `/` — Homepage: breaking news ticker, featured article, latest 9 articles, events, videos
- [x] `/articles` — Article listing with pagination
- [x] `/article/:slug` — Single article: OG/Twitter/JSON-LD, EN/HI/TE language toggle, reading time, tags, social share, comments, related articles
- [x] `/category/:slug` — Filtered article listing with pagination
- [x] `/tag/:slug` — Tag page with article grid + pagination
- [x] `/author/:username` — Author profile: avatar, bio, article count, article grid
- [x] `/events` — Upcoming and past events
- [x] `/gallery` — Album grid with photo count badges
- [x] `/gallery/:slug` — Photo grid with lightbox (prev/next/keyboard navigation)
- [x] `/videos` — YouTube thumbnail grid, category filter buttons, click-to-play embed
- [x] `/about` — About GTimes
- [x] `/search` — Full-text article search
- [x] `/newsletter/unsubscribe` — Unsubscribe confirmation page

---

## 3. Admin Panel ✅ ALL DONE

- [x] `/login` — Auth with bcrypt
- [x] `/` — Dashboard: stats + recent articles + pending comments count
- [x] `/articles` — Filterable table: status, keyword search, publish/unpublish/edit/delete
- [x] `/articles/new` + `/articles/:id/edit` — Quill editor with EN/HI/TE language tabs, cover image, tags, category, featured toggle
- [x] `/events` + `/events/new` + `/events/:id/edit` — Events management with cover image
- [x] `/gallery` — Album cards; create album; upload photos (magic byte validated)
- [x] `/videos` — YouTube URL inline add form + thumbnail table
- [x] `/comments` — Tabbed by status: pending/approved/spam; approve, mark spam, delete
- [x] `/newsletter` — Subscriber list with count, delete
- [x] `/users` (super only) — Create/edit/delete admin users with role selector (author/editor/super)
- [x] `/profile` — Own bio + avatar upload
- [x] `/settings` — Site identity, social links, breaking news ticker text, comment toggles, password change

---

## 4. Features ✅ ALL BUILT

- [x] Multi-language article toggle — EN / हिंदी / తెలుగు
- [x] Language toggle only shown if translation content exists
- [x] Breaking news ticker on homepage (CSS keyframe animation)
- [x] Article reading time (computed from word count)
- [x] Article tags (many-to-many), tag pages with pagination
- [x] Author profiles at `/author/:username`
- [x] Article comments with moderation queue
- [x] Photo gallery lightbox (prev/next/keyboard/ESC + captions)
- [x] YouTube video embed with thumbnail click-to-play + category filter
- [x] Social share: WhatsApp, Twitter/X, Facebook, Copy Link, Print
- [x] Print-friendly article stylesheet
- [x] Newsletter subscribe/unsubscribe with crypto token
- [x] `/rss.xml` — RSS 2.0 with `media:thumbnail`
- [x] `/sitemap.xml` — Dynamic: articles + categories + tags
- [x] `/robots.txt`
- [x] GTimes → Greenwood webhook on article/event publish
- [x] Cookie consent banner (localStorage `gt_cookie_consent`)
- [x] WhatsApp float button in footer
- [x] SEO: OG + Twitter Card + JSON-LD on article pages; `og:image` always emitted (cover or fallback)
- [x] Canonical URLs on article pages
- [x] **Bento inline gallery** — 1 big + uniform squares + `+N` overflow, full lightbox with counter
- [x] **Image protection** — right-click disabled, iOS long-press blocked, footer copyright notice

---

## 5. Security ✅ ALL DONE

- [x] bcrypt password hashing
- [x] Session-based admin auth (MySQLStore)
- [x] CSRF on all form POST routes
- [x] Rate limiting: form submissions + newsletter subscribe
- [x] Multer with magic byte validation for all image uploads
- [x] Role-based access: author / editor / super
- [x] Helmet.js HTTP security headers

---

## 6. Database Schema ✅ COMPLETE

Tables: `admins`, `sessions`, `categories`, `articles` (with content_hi, content_te), `tags`, `article_tags`, `events`, `gallery_albums`, `gallery_photos`, `videos`, `comments`, `newsletter_subscribers`, `settings`

Default admin: `admin` / `gtimes@admin` — **change on first login**

---

## 7. Webhook Integration ⏳ PENDING

- [ ] Set `GTIMES_WEBHOOK_SECRET` in `D:\gtimes\.env`
- [ ] Set matching `GTIMES_WEBHOOK_SECRET` in `D:\Greenwood\.env`
- [ ] Set `GREENWOOD_WEBHOOK_URL=https://ghs.ac.in/api/gtimes/sync` in `D:\gtimes\.env`
- [ ] Test: publish article → verify it appears on `ghs.ac.in/news`
- [ ] Test: create event → verify it appears on `ghs.ac.in/events`

---

## 8. Deployment ✅ DONE

Site is live at `gtimes.in` and `admin.gtimes.in`.

- [x] `.env` filled with production values
- [x] `npm install` complete
- [x] Database imported
- [x] Upload directories created
- [x] `NODE_ENV=production`
- [x] Hostinger SMTP configured
- [x] DNS: `gtimes.in` + `admin.gtimes.in` → server IP
- [x] SSL certificates active
- [x] Nginx reverse proxy on port 3001
- [x] PM2: `pm2 start app.js --name gtimes`

---

## 9. Testing Checklist ⏳ PARTIAL

- [ ] Admin login → logout → login again
- [ ] Create English-only article → verify no language toggle shown
- [ ] Create article with HI + TE translations → verify toggle appears
- [ ] Upload cover image → verify on card and article page
- [ ] Submit comment → approve → verify appears on article
- [x] Inline bento gallery renders correctly in articles (verified live)
- [x] WhatsApp link preview shows thumbnail (verified live — `og:image` fix)
- [ ] Create album → upload photos → verify lightbox prev/next/keyboard nav
- [ ] Add YouTube video → verify thumbnail + embed + category filter
- [ ] Create event → verify on events page
- [ ] Search for article by title
- [ ] Subscribe to newsletter → verify in admin list
- [ ] Test RSS feed at `/rss.xml`
- [ ] Test sitemap at `/sitemap.xml`
- [ ] Publish article → verify webhook fires → confirm on `ghs.ac.in/news`
- [ ] Test 404 page
- [ ] Test on mobile (nav collapse, bento gallery layout, lightbox touch)

---

## Quick Reference

| URL | Purpose |
|-----|---------|
| `gtimes.in` | Public news site |
| `admin.gtimes.in` | Admin panel |
| `gtimes.in/search?q=` | Search |
| `gtimes.in/rss.xml` | RSS feed |
| `gtimes.in/sitemap.xml` | Sitemap |
| `POST ghs.ac.in/api/gtimes/sync` | Greenwood webhook endpoint |

Default admin: `admin` / `gtimes@admin` — **change immediately after first login**
