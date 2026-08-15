# GTimes — Project TODO

## Status: ✅ COMPLETE — Live at gtimes.in

---

## 1. Content ✅ DONE

- [x] GTimes logo (PNG + SVG) → `public/images/logo.png`
- [x] Favicon → `public/favicon.ico` + `public/favicon.png`
- [x] About page text — tagline, mission statement, editorial team bio
- [x] Default cover image (1200×630px) → `public/images/default-cover.jpg`
- [x] Social media handles set via admin Settings

---

## 2. Public Pages ✅ ALL DONE (13 pages)

- [x] `/` — Homepage: breaking news ticker, featured article, latest 9 articles, events, videos
- [x] `/articles` — Article listing with pagination
- [x] `/article/:slug` — Single article: OG/Twitter/JSON-LD, EN/HI/TE toggle, reading time, tags, social share, comments, related articles
- [x] `/category/:slug` — Filtered article listing with pagination
- [x] `/tag/:slug` — Tag page with article grid + pagination
- [x] `/author/:username` — Author profile: avatar, bio, article count, article grid
- [x] `/events` — Upcoming and past events
- [x] `/gallery` — Album grid with photo count badges
- [x] `/gallery/:slug` — Photo grid with lightbox (prev/next/keyboard navigation)
- [x] `/videos` — YouTube thumbnail grid, category filter, click-to-play embed
- [x] `/about` — About GTimes
- [x] `/search` — Full-text article search
- [x] `/newsletter/unsubscribe` — Unsubscribe confirmation page

---

## 3. Admin Panel ✅ ALL DONE

- [x] Login, Dashboard, Articles CRUD, Events CRUD
- [x] Gallery (albums + photos), Videos, Comments moderation
- [x] Newsletter subscribers, Users (super only), Profile, Settings

---

## 4. Features ✅ ALL DONE

- [x] Multi-language toggle EN / हिंदी / తెలుగు
- [x] Breaking news ticker, Reading time, Article tags
- [x] Author profiles, Comments with moderation queue
- [x] Photo gallery lightbox, YouTube embed + category filter
- [x] Social share (WhatsApp, Twitter, Facebook, Copy Link, Print)
- [x] Newsletter subscribe/unsubscribe
- [x] RSS feed, Sitemap, Robots.txt
- [x] GTimes → Greenwood webhook (publish, unpublish, delete for articles and events)
- [x] Cookie consent banner, WhatsApp float button
- [x] SEO: OG + Twitter Card + JSON-LD; `og:image` always emitted (cover or fallback)
- [x] Bento inline gallery — 1 big + uniform squares + `+N` overflow + lightbox
- [x] Image protection — right-click disabled, iOS long-press blocked, footer copyright

---

## 5. Security ✅ ALL DONE

- [x] bcrypt, session auth, CSRF, rate limiting, magic byte validation, RBAC, Helmet.js

---

## 6. Database ✅ COMPLETE

Tables: `admins`, `sessions`, `categories`, `articles`, `tags`, `article_tags`, `events`, `gallery_albums`, `gallery_photos`, `videos`, `comments`, `newsletter_subscribers`, `settings`

---

## 7. Webhook Integration ✅ DONE

- [x] `GTIMES_WEBHOOK_SECRET` set in `D:\gtimes\.env`
- [x] Matching secret set in `D:\Greenwood\.env`
- [x] `GREENWOOD_WEBHOOK_URL=https://ghs.ac.in/api/gtimes/sync` set
- [x] Publish → syncs to GHS ✅
- [x] Unpublish / Delete → deactivates on GHS ✅ (fixed 2026-08-15)
- [x] Test sample article (gtimes_id=4) manually cleaned from GHS DB

---

## 8. Deployment ✅ DONE

Live at `gtimes.in` and `admin.gtimes.in` with SSL, Nginx, PM2.

---

## 9. Testing ✅ VERIFIED IN PRODUCTION

- [x] Articles publish and display correctly
- [x] WhatsApp link preview shows thumbnail (og:image fix verified)
- [x] Inline bento gallery renders in articles (verified live)
- [x] Webhook syncs articles to GHS on publish
- [x] Webhook deactivates on GHS when deleted/unpublished (fix verified)
- [x] Multi-language toggle working
- [x] Image right-click protection active

---

## Quick Reference

| URL | Purpose |
|-----|---------|
| `gtimes.in` | Public news site |
| `admin.gtimes.in` | Admin panel |
| `gtimes.in/rss.xml` | RSS feed |
| `gtimes.in/sitemap.xml` | Sitemap |
| `POST ghs.ac.in/api/gtimes/sync` | Greenwood webhook endpoint |

Default admin: `admin` / `gtimes@admin` — **change immediately after first login**
