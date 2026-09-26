# GTimes

Product: Client platform — student media/newspaper for Greenwood High School
Domain: gtimes.in
Virora AI agents: D:\Virora-AI\agents\ | Shared context: D:\Virora-AI\

## Stack
- Runtime: Node.js + Express.js
- Templates: EJS
- Database: MySQL2 (express-mysql-session for sessions)
- Session: express-session
- Email: Nodemailer (Hostinger SMTP — news@gtimes.in)
- File upload: Multer (uploads stored at UPLOADS_DIR, outside repo)
- Security: Helmet, express-rate-limit, express-validator
- Port: 3001

## MVC structure
- app.js — entry point
- controllers/, routes/, views/, models/, middleware/, services/, utils/, public/

## Webhook integration (critical)
GTimes POSTs to Greenwood on every article/event/gallery publish:
- URL: GREENWOOD_WEBHOOK_URL (default: https://ghs.ac.in/api/gtimes/sync)
- Auth: GREENWOOD_WEBHOOK_SECRET (must match Greenwood's GTIMES_WEBHOOK_SECRET)
- Content types: article / event / gallery
- If webhook fails, content is published on GTimes but NOT synced to Greenwood — handle failures gracefully

## Architecture constraints
- Uploads: UPLOADS_DIR env var — persistent path OUTSIDE repo on production
- Webhook secret must be kept in sync with Greenwood's env

## Context rule
Repository is the source of truth. If this file conflicts with current code/config, flag CONTEXT DRIFT.
