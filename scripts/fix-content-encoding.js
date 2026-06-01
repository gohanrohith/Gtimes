/**
 * One-time fix: decode HTML-escaped article content caused by using <%= %> instead of <%- %>
 * in the Quill editor containers. Each edit compounded the escaping.
 * Run: node scripts/fix-content-encoding.js [--dry-run]
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DRY_RUN = process.argv.includes('--dry-run');

function decodeOnce(str) {
  // &amp; MUST be first so &amp;lt; → &lt; → < over successive passes
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function decodeUntilStable(str) {
  if (!str) return str;
  let current = str;
  for (let i = 0; i < 20; i++) {
    const next = decodeOnce(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

function isCorrupted(str) {
  return str && /&lt;|&gt;|&amp;/.test(str);
}

async function main() {
  const pool = await mysql.createPool({
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'gtimes_db',
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  });

  const [articles] = await pool.execute(
    'SELECT id, title, content, content_hi, content_te FROM articles'
  );

  console.log(`Found ${articles.length} articles. Dry run: ${DRY_RUN}\n`);

  let fixed = 0;
  for (const a of articles) {
    const fields = ['content', 'content_hi', 'content_te'];
    const changed = {};

    for (const field of fields) {
      if (isCorrupted(a[field])) {
        changed[field] = decodeUntilStable(a[field]);
      }
    }

    if (Object.keys(changed).length === 0) continue;

    console.log(`[${a.id}] "${a.title}"`);
    for (const [field, clean] of Object.entries(changed)) {
      console.log(`  ${field}: ${a[field].slice(0, 80).replace(/\n/g, ' ')} ...`);
      console.log(`    → ${clean.slice(0, 80).replace(/\n/g, ' ')} ...`);
    }

    if (!DRY_RUN) {
      const sets = fields.map(f => `${f}=?`).join(', ');
      const vals = fields.map(f => changed[f] !== undefined ? changed[f] : a[f]);
      await pool.execute(
        `UPDATE articles SET ${sets} WHERE id=?`,
        [...vals, a.id]
      );
    }

    fixed++;
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] Would fix' : 'Fixed'} ${fixed} articles.`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
