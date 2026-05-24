# GTimes — Project TODO

## Status: Development complete. Pending content + deployment.

---

## 1. Content Needed From Client ⏳ PENDING

- [ ] **GTimes logo** (PNG + SVG) → `public/images/logo.png`
- [ ] **Favicon** → `public/favicon.ico` + `public/favicon.png` (512×512)
- [ ] **About page text** — tagline, mission statement, editorial team bio
- [ ] **Default cover image** for articles without a cover → `public/images/default-cover.jpg`
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

- [x] Multi-language article toggle — EN / हिंदी / తెలుగు (admin pastes AI translations into separate Quill tabs)
- [x] Language toggle only shown if translation content exists (no empty buttons for EN-only articles)
- [x] Breaking news ticker on homepage (set from admin Settings, CSS keyframe animation)
- [x] Article reading time (computed from word count, shown on cards and article page)
- [x] Article tags (many-to-many: tags + article_tags), tag pages with pagination
- [x] Author profiles public page at `/author/:username`
- [x] Article comments with moderation queue (pending → approved/spam)
- [x] Photo gallery lightbox with prev/next/keyboard/ESC navigation + captions
- [x] YouTube video embed with thumbnail click-to-play
- [x] Video category filter buttons
- [x] Social share buttons on articles: WhatsApp, Twitter/X, Facebook, Copy Link, Print
- [x] Print-friendly article stylesheet (hides nav, sidebar, share area, cookie banner)
- [x] Newsletter subscribe/unsubscribe with crypto token; subscriber list in admin
- [x] `/rss.xml` — RSS 2.0 feed with `media:thumbnail` namespace (last 20 published articles)
- [x] `/sitemap.xml` — Dynamic, includes articles + categories + tags
- [x] `/robots.txt` — Disallows `/api/`
- [x] GTimes → Greenwood webhook: on article/event publish, fires `POST ghs.ac.in/api/gtimes/sync`
- [x] Cookie consent banner on all public pages (localStorage key `gt_cookie_consent`)
- [x] WhatsApp float button in footer (all public pages)
- [x] SEO: OG + Twitter Card + JSON-LD `NewsArticle` on article pages; `NewsMediaOrganization` on homepage
- [x] Canonical URLs on article pages

---

## 5. Security ✅ ALL DONE

- [x] bcrypt password hashing
- [x] Session-based admin auth (MySQLStore)
- [x] CSRF on all form POST routes
- [x] Rate limiting: form submissions + newsletter subscribe
- [x] Multer with magic byte validation for all image uploads
- [x] Role-based access: author / editor / super; `/users` requires super
- [x] Helmet.js HTTP security headers

---

## 6. Database Schema ✅ COMPLETE

Tables: `admins` (with bio + avatar), `sessions`, `categories`, `articles` (with content_hi, content_te), `tags`, `article_tags`, `events`, `gallery_albums`, `gallery_photos`, `videos`, `comments`, `newsletter_subscribers`, `settings`

Default admin: `admin` / `gtimes@admin` — **change on first login**

---

## 7. Webhook Integration ⏳ PENDING (needs matching secrets)

- [ ] Set `GTIMES_WEBHOOK_SECRET` in `D:\gtimes\.env`
- [ ] Set matching `GTIMES_WEBHOOK_SECRET` in `D:\Greenwood\.env`
- [ ] Set `GREENWOOD_WEBHOOK_URL=https://ghs.ac.in/api/gtimes/sync` in `D:\gtimes\.env`
- [ ] Test: publish article in GTimes → verify it appears on `ghs.ac.in` news page
- [ ] Test: create event in GTimes → verify it appears on `ghs.ac.in` events page

---

## 8. Deployment Checklist ⏳ PENDING

- [ ] `cp .env.example .env` and fill in all values
- [ ] `npm install` in `D:\gtimes`
- [ ] Import `database/schema.sql` into `gtimes_db`
- [ ] Create upload directories: `public/uploads/{articles,events,gallery,avatars,videos}/`
- [ ] Set `NODE_ENV=production`
- [ ] Set `MAIN_DOMAIN=gtimes.in`
- [ ] Configure Hostinger SMTP credentials
- [ ] Point `gtimes.in` → server IP (A record)
- [ ] Point `admin.gtimes.in` → server IP (A record)
- [ ] SSL certificates for both domains
- [ ] Configure Nginx reverse proxy (port 3001)
- [ ] Set up PM2: `pm2 start app.js --name gtimes`
- [ ] Ensure `/public/uploads/` subdirs exist and are writable
- [ ] Change default admin password on first login

---

## 9. Testing Checklist ⏳ NOT DONE

- [ ] Admin login → logout → login again
- [ ] Create English-only article → publish → verify no language toggle shown
- [ ] Create article with HI + TE translations → verify toggle appears and switches
- [ ] Upload cover image → verify displayed on card and article page
- [ ] Submit comment → approve from admin → verify appears on article page
- [ ] Create album → upload photos → verify lightbox prev/next/keyboard nav + captions
- [ ] Add YouTube video → verify thumbnail + embed player + category filter
- [ ] Create event → verify appears on events page
- [ ] Search for an article by title
- [ ] Subscribe to newsletter → verify in admin subscriber list
- [ ] Test RSS feed at `/rss.xml`
- [ ] Test sitemap at `/sitemap.xml`
- [ ] Publish article → verify GTimes webhook fires → confirm article on `ghs.ac.in/news`
- [ ] Test 404 page
- [ ] Test on mobile (nav collapse, lightbox touch)

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
