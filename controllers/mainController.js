const { query, queryOne } = require('../config/db');
const { readingTime }    = require('../utils/readingTime');
const crypto             = require('crypto');

async function q(sql, params = []) {
  try { return await query(sql, params); } catch { return []; }
}
async function q1(sql, params = []) {
  try { const r = await query(sql, params); return r[0] || null; }
  catch { return null; }
}

async function getSettings() {
  const rows = await q('SELECT setting_key, value FROM settings');
  const m = {};
  rows.forEach(r => { m[r.setting_key] = r.value; });
  return m;
}

async function getCategories() {
  return q('SELECT * FROM categories ORDER BY sort_order ASC');
}

// Attach reading_time to each article in an array
function withReadingTime(articles) {
  return articles.map(a => ({ ...a, reading_time: readingTime(a.content) }));
}

// Fetch tags for an article
async function getArticleTags(articleId) {
  return q(`SELECT t.* FROM tags t JOIN article_tags at ON at.tag_id=t.id WHERE at.article_id=?`, [articleId]);
}

// ── Auto-publish scheduled articles ──────────────────────
async function autoPublishScheduled() {
  try {
    await query(
      `UPDATE articles SET status='published', published_at=scheduled_at
       WHERE status='draft' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()`
    );
  } catch { /* column may not exist on older DB */ }
}

// ── Home ────────────────────────────────────────────────
exports.home = async (req, res) => {
  autoPublishScheduled().catch(() => {});
  const [settings, categories, featuredArr, latest, events, videos, trending] = await Promise.all([
    getSettings(),
    getCategories(),
    q(`SELECT a.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color
       FROM articles a LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.status='published' AND a.featured=1
       ORDER BY a.published_at DESC LIMIT 1`),
    q(`SELECT a.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color
       FROM articles a LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.status='published'
       ORDER BY a.published_at DESC LIMIT 9`),
    q(`SELECT * FROM events WHERE status='upcoming' ORDER BY event_date ASC LIMIT 4`),
    q(`SELECT * FROM videos WHERE status='published' ORDER BY created_at DESC LIMIT 4`),
    q(`SELECT a.title, a.slug, a.views, a.published_at, c.color AS cat_color, c.name AS cat_name
       FROM articles a LEFT JOIN categories c ON a.category_id=c.id
       WHERE a.status='published' ORDER BY a.views DESC LIMIT 5`),
  ]);
  res.render('main/index', {
    title: `${settings.site_name || 'GTimes'} — ${settings.site_tagline || 'Your School. Your Stories.'}`,
    settings, categories,
    featured: featuredArr[0] ? { ...featuredArr[0], reading_time: readingTime(featuredArr[0].content) } : null,
    latest: withReadingTime(latest),
    events, videos, trending,
  });
};

// ── Articles listing ─────────────────────────────────────
exports.articles = async (req, res) => {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const page    = Math.max(1, parseInt(req.query.page) || 1);
  const perPage = parseInt(settings.articles_per_page) || 12;
  const offset  = (page - 1) * perPage;
  const year    = req.query.year ? parseInt(req.query.year) : null;

  const yearFilter = year ? ' AND YEAR(a.published_at) = ?' : '';
  const params     = year ? [perPage, offset, year] : [perPage, offset];
  const countParams = year ? ['published', year] : ['published'];

  const [count, articles, availableYears] = await Promise.all([
    q1(`SELECT COUNT(*) AS c FROM articles a WHERE a.status=?${year ? ' AND YEAR(a.published_at)=?' : ''}`, countParams),
    q(`SELECT a.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color
       FROM articles a LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.status='published'${yearFilter}
       ORDER BY a.published_at DESC LIMIT ? OFFSET ?`, params),
    q(`SELECT YEAR(published_at) AS yr, COUNT(*) AS cnt
       FROM articles WHERE status='published'
       GROUP BY yr ORDER BY yr DESC`),
  ]);

  const total = count?.c || 0;
  res.render('main/articles', {
    title: year ? `${year} Archive | ${settings.site_name || 'GTimes'}` : `All Articles | ${settings.site_name || 'GTimes'}`,
    settings, categories, articles: withReadingTime(articles),
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    activeYear: year,
    availableYears,
  });
};

// ── Inline gallery processor ─────────────────────────────
async function processInlineGalleries(content) {
  if (!content) return content;
  const regex = /<div class="gt-inline-gallery" data-album="(\d+)"[^>]*><\/div>/gi;
  const matches = [...content.matchAll(/<div class="gt-inline-gallery" data-album="(\d+)"[^>]*><\/div>/gi)];
  if (!matches.length) return content;
  const albumIds = [...new Set(matches.map(m => parseInt(m[1])))];
  const galleries = {};
  await Promise.all(albumIds.map(async id => {
    const [album, photos] = await Promise.all([
      q1('SELECT * FROM gallery_albums WHERE id=? AND is_active=1', [id]),
      q('SELECT * FROM gallery_photos WHERE album_id=? ORDER BY sort_order ASC, id ASC LIMIT 20', [id]),
    ]);
    if (album && photos.length) galleries[id] = { album, photos };
  }));
  return content.replace(regex, (match, id) => {
    const g = galleries[parseInt(id)];
    if (!g) return '';
    const photosHtml = g.photos.map(p =>
      `<div class="gt-photo-item" data-src="/uploads/gallery/${p.filename}" data-caption="${(p.caption||'').replace(/"/g,'&quot;')}"><img src="/uploads/gallery/${p.filename}" alt="${(p.caption||'').replace(/"/g,'&quot;')}" loading="lazy" onerror="this.closest('.gt-photo-item').style.display='none'"></div>`
    ).join('');
    return `<div class="gt-article-gallery"><div class="gt-article-gallery-header"><i class="fas fa-images"></i> ${g.album.title} <span style="font-weight:400;color:var(--gt-gray);margin-left:.4rem">${g.photos.length} photos</span></div><div class="gt-article-gallery-grid">${photosHtml}</div></div>`;
  });
}

// ── Single article ───────────────────────────────────────
exports.article = async (req, res) => {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const article = await q1(
    `SELECT a.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color,
            adm.username AS author_username, adm.bio AS author_bio, adm.avatar AS author_avatar
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN admins adm ON a.created_by = adm.id
     WHERE a.slug=? AND a.status='published'`, [req.params.slug]);
  if (!article) return res.status(404).render('404', { title: '404 | GTimes' });

  q('UPDATE articles SET views = views + 1 WHERE id=?', [article.id]).catch(() => {});

  const [comments, related, tags] = await Promise.all([
    q(`SELECT * FROM comments WHERE article_id=? AND status='approved' ORDER BY created_at ASC`, [article.id]),
    q(`SELECT a.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color
       FROM articles a LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.status='published' AND a.id != ? AND a.category_id = ?
       ORDER BY a.published_at DESC LIMIT 3`, [article.id, article.category_id || 0]),
    getArticleTags(article.id),
  ]);

  const domain = process.env.NODE_ENV === 'production' ? 'https://gtimes.in' : `http://localhost:${process.env.PORT || 3001}`;

  article.content    = await processInlineGalleries(article.content);
  article.content_hi = await processInlineGalleries(article.content_hi);
  article.content_te = await processInlineGalleries(article.content_te);

  res.render('main/article', {
    title: `${article.title} | ${settings.site_name || 'GTimes'}`,
    settings, categories, article: { ...article, reading_time: readingTime(article.content) },
    comments, related: withReadingTime(related), tags,
    success: req.query.success || null,
    error:   req.query.error   || null,
    domain,
    canonicalUrl: `${domain}/article/${article.slug}`,
  });
};

// ── Post comment ─────────────────────────────────────────
exports.postComment = async (req, res) => {
  const article = await q1('SELECT id, title FROM articles WHERE slug=? AND status=?', [req.params.slug, 'published']);
  if (!article) return res.status(404).send('Not found');

  const settings = await getSettings();
  if (settings.comments_enabled === '0') return res.redirect(`/article/${req.params.slug}`);

  const { name, email, content } = req.body;
  if (!name || !content) return res.redirect(`/article/${req.params.slug}?error=Name+and+comment+are+required`);

  try {
    const commentStatus = settings.comments_moderation === '0' ? 'approved' : 'pending';
    await query('INSERT INTO comments (article_id, name, email, content, status) VALUES (?,?,?,?,?)',
      [article.id, name.trim(), email?.trim() || null, content.trim(), commentStatus]);
    if (commentStatus === 'pending') {
      const { notifyNewComment } = require('../config/mailer');
      notifyNewComment({ article_title: article.title, name, email, content }).catch(() => {});
    }
  } catch { /* DB not ready */ }

  res.redirect(`/article/${req.params.slug}?success=comment`);
};

// ── Category ─────────────────────────────────────────────
exports.category = async (req, res) => {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const cat = await q1('SELECT * FROM categories WHERE slug=?', [req.params.slug]);
  if (!cat) return res.status(404).render('404', { title: '404 | GTimes' });

  const page    = Math.max(1, parseInt(req.query.page) || 1);
  const perPage = parseInt((await getSettings()).articles_per_page) || 12;
  const offset  = (page - 1) * perPage;

  const [count, articles] = await Promise.all([
    q1('SELECT COUNT(*) AS c FROM articles WHERE status=? AND category_id=?', ['published', cat.id]),
    q(`SELECT a.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color
       FROM articles a LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.status='published' AND a.category_id=?
       ORDER BY a.published_at DESC LIMIT ? OFFSET ?`, [cat.id, perPage, offset]),
  ]);

  const total = count?.c || 0;
  res.render('main/category', {
    title: `${cat.name} | ${settings.site_name || 'GTimes'}`,
    settings, categories, cat, articles: withReadingTime(articles),
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
};

// ── Tag page ─────────────────────────────────────────────
exports.tag = async (req, res) => {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const tag = await q1('SELECT * FROM tags WHERE slug=?', [req.params.slug]);
  if (!tag) return res.status(404).render('404', { title: '404 | GTimes' });

  const page    = Math.max(1, parseInt(req.query.page) || 1);
  const perPage = 12;
  const offset  = (page - 1) * perPage;

  const [count, articles] = await Promise.all([
    q1(`SELECT COUNT(*) AS c FROM articles a JOIN article_tags at ON at.article_id=a.id WHERE at.tag_id=? AND a.status='published'`, [tag.id]),
    q(`SELECT a.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color
       FROM articles a
       LEFT JOIN categories c ON a.category_id = c.id
       JOIN article_tags at ON at.article_id = a.id
       WHERE at.tag_id=? AND a.status='published'
       ORDER BY a.published_at DESC LIMIT ? OFFSET ?`, [tag.id, perPage, offset]),
  ]);

  const total = count?.c || 0;
  res.render('main/tag', {
    title: `#${tag.name} | ${settings.site_name || 'GTimes'}`,
    settings, categories, tag, articles: withReadingTime(articles),
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
};

// ── Author profile ───────────────────────────────────────
exports.author = async (req, res) => {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const author = await q1('SELECT id, username, name, bio, avatar, role FROM admins WHERE username=?', [req.params.username]);
  if (!author) return res.status(404).render('404', { title: '404 | GTimes' });

  const page    = Math.max(1, parseInt(req.query.page) || 1);
  const perPage = 12;
  const offset  = (page - 1) * perPage;

  const [count, articles] = await Promise.all([
    q1('SELECT COUNT(*) AS c FROM articles WHERE created_by=? AND status=?', [author.id, 'published']),
    q(`SELECT a.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color
       FROM articles a LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.created_by=? AND a.status='published'
       ORDER BY a.published_at DESC LIMIT ? OFFSET ?`, [author.id, perPage, offset]),
  ]);

  const total = count?.c || 0;
  res.render('main/author', {
    title: `${author.name} | ${settings.site_name || 'GTimes'}`,
    settings, categories, author, articles: withReadingTime(articles),
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
};

// ── Events ───────────────────────────────────────────────
const CAMPUSES = ['Hasanparthy', 'Hunter Road', 'Mancherial', 'Gopalpur', 'Naimnagar'];

exports.events = async (req, res) => {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const campus = req.query.campus || '';
  const campusFilter = campus ? ' AND (campus=? OR campus="all" OR campus IS NULL)' : '';
  const campusParam  = campus ? [campus] : [];

  const [upcoming, past] = await Promise.all([
    q(`SELECT * FROM events WHERE status IN ('upcoming','ongoing')${campusFilter} ORDER BY event_date ASC`,
      [...campusParam]),
    q(`SELECT * FROM events WHERE status='completed'${campusFilter} ORDER BY event_date DESC LIMIT 12`,
      [...campusParam]),
  ]);
  res.render('main/events', {
    title: `Events | ${settings.site_name || 'GTimes'}`,
    settings, categories, upcoming, past,
    activeCampus: campus, campuses: CAMPUSES,
  });
};

// ── Gallery ──────────────────────────────────────────────
exports.gallery = async (req, res) => {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const campus = req.query.campus || '';
  const campusFilter = campus ? ' AND (ga.campus=? OR ga.campus="all")' : '';
  const campusParam  = campus ? [campus] : [];

  const albums = await q(
    `SELECT ga.*, COUNT(gp.id) AS photo_count
     FROM gallery_albums ga LEFT JOIN gallery_photos gp ON gp.album_id = ga.id
     WHERE ga.is_active=1${campusFilter} GROUP BY ga.id ORDER BY ga.created_at DESC`,
    campusParam
  );
  res.render('main/gallery', {
    title: `Gallery | ${settings.site_name || 'GTimes'}`,
    settings, categories, albums,
    activeCampus: campus, campuses: CAMPUSES,
  });
};

exports.album = async (req, res) => {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const album = await q1('SELECT * FROM gallery_albums WHERE slug=? AND is_active=1', [req.params.slug]);
  if (!album) return res.status(404).render('404', { title: '404 | GTimes' });

  const photos = await q('SELECT * FROM gallery_photos WHERE album_id=? ORDER BY sort_order ASC, created_at ASC', [album.id]);
  res.render('main/album', {
    title: `${album.title} | Gallery | ${settings.site_name || 'GTimes'}`,
    settings, categories, album, photos,
  });
};

// ── Videos ───────────────────────────────────────────────
exports.videos = async (req, res) => {
  const [settings, categories, allVideos] = await Promise.all([
    getSettings(), getCategories(),
    q(`SELECT * FROM videos WHERE status='published' ORDER BY created_at DESC`),
  ]);

  // Group by category
  const grouped = {};
  const catOrder = [];
  allVideos.forEach(v => {
    const cat = v.category || 'general';
    if (!grouped[cat]) { grouped[cat] = []; catOrder.push(cat); }
    grouped[cat].push(v);
  });

  const activeFilter = req.query.category || '';
  const videos = activeFilter ? (grouped[activeFilter] || []) : allVideos;
  const videoCategories = catOrder.map(c => ({ key: c, label: c.charAt(0).toUpperCase() + c.slice(1), count: grouped[c].length }));

  res.render('main/videos', {
    title: `Videos | ${settings.site_name || 'GTimes'}`,
    settings, categories, videos, videoCategories, activeFilter,
  });
};

// ── About ────────────────────────────────────────────────
exports.about = async (req, res) => {
  const [settings, categories, reviews] = await Promise.all([
    getSettings(),
    getCategories(),
    q('SELECT * FROM google_reviews ORDER BY synced_at DESC LIMIT 6'),
  ]);
  res.render('main/about', {
    title: `About | ${settings.site_name || 'GTimes'}`,
    settings, categories, reviews,
  });
};

// ── Search ───────────────────────────────────────────────
exports.search = async (req, res) => {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const q_ = (req.query.q || '').trim();
  let results = [];
  if (q_.length >= 2) {
    const like = `%${q_}%`;
    results = await q(
      `SELECT a.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color
       FROM articles a LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.status='published' AND (a.title LIKE ? OR a.excerpt LIKE ? OR a.content LIKE ?)
       ORDER BY a.published_at DESC LIMIT 30`,
      [like, like, like]);
    results = withReadingTime(results);
  }
  res.render('main/search', {
    title: q_ ? `Search: ${q_} | GTimes` : `Search | GTimes`,
    settings, categories, results, q: q_,
  });
};

// ── Newsletter subscribe ──────────────────────────────────
exports.newsletterSubscribe = async (req, res) => {
  const { email, name } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.redirect('/?newsletter=invalid');
  }
  try {
    const token = crypto.randomBytes(32).toString('hex');
    await query(
      'INSERT INTO newsletter_subscribers (email, name, token) VALUES (?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
      [email.trim().toLowerCase(), (name || '').trim() || null, token]);
    return res.redirect('/?newsletter=success');
  } catch {
    return res.redirect('/?newsletter=error');
  }
};

// ── Newsletter unsubscribe ────────────────────────────────
exports.newsletterUnsubscribe = async (req, res) => {
  const { token } = req.query;
  if (token) {
    await q('DELETE FROM newsletter_subscribers WHERE token=?', [token]);
  }
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  res.render('main/unsubscribe', { title: `Unsubscribed | GTimes`, settings, categories, done: !!token });
};

// ── Sitemap ──────────────────────────────────────────────
exports.sitemap = async (req, res) => {
  const domain = process.env.NODE_ENV === 'production' ? 'https://gtimes.in' : `http://localhost:${process.env.PORT || 3001}`;
  const [articles, cats, tags] = await Promise.all([
    q(`SELECT slug, updated_at FROM articles WHERE status='published'`),
    q(`SELECT slug FROM categories`),
    q(`SELECT slug FROM tags`),
  ]);

  let xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  const pages = ['/', '/articles', '/events', '/gallery', '/videos', '/about'];
  pages.forEach(p => { xml += `<url><loc>${domain}${p}</loc><changefreq>daily</changefreq></url>`; });
  cats.forEach(c  => { xml += `<url><loc>${domain}/category/${c.slug}</loc><changefreq>weekly</changefreq></url>`; });
  tags.forEach(t  => { xml += `<url><loc>${domain}/tag/${t.slug}</loc><changefreq>weekly</changefreq></url>`; });
  articles.forEach(a => {
    xml += `<url><loc>${domain}/article/${a.slug}</loc><lastmod>${new Date(a.updated_at).toISOString().split('T')[0]}</lastmod><changefreq>monthly</changefreq></url>`;
  });
  xml += `</urlset>`;
  res.header('Content-Type', 'application/xml').send(xml);
};

// ── RSS feed ──────────────────────────────────────────────
exports.rss = async (req, res) => {
  const domain = process.env.NODE_ENV === 'production' ? 'https://gtimes.in' : `http://localhost:${process.env.PORT || 3001}`;
  const [settings, articles] = await Promise.all([
    getSettings(),
    q(`SELECT a.*, c.name AS cat_name FROM articles a LEFT JOIN categories c ON a.category_id=c.id
       WHERE a.status='published' ORDER BY a.published_at DESC LIMIT 20`),
  ]);
  const siteName = settings.site_name || 'GTimes';
  const tagline  = settings.site_tagline || 'Your School. Your Stories.';
  const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(siteName)}</title>
    <link>${domain}</link>
    <description>${esc(tagline)}</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${domain}/rss.xml" rel="self" type="application/rss+xml"/>`;

  for (const a of articles) {
    rss += `
    <item>
      <title>${esc(a.title)}</title>
      <link>${domain}/article/${a.slug}</link>
      <description>${esc(a.excerpt || '')}</description>
      <pubDate>${new Date(a.published_at).toUTCString()}</pubDate>
      <guid isPermaLink="true">${domain}/article/${a.slug}</guid>
      ${a.cat_name ? `<category>${esc(a.cat_name)}</category>` : ''}
      ${a.cover_image ? `<media:thumbnail url="${domain}/uploads/articles/${a.cover_image}"/>` : ''}
    </item>`;
  }

  rss += `\n  </channel>\n</rss>`;
  res.header('Content-Type', 'application/rss+xml; charset=utf-8').send(rss);
};

// ── Robots ───────────────────────────────────────────────
exports.robots = (req, res) => {
  const domain = process.env.NODE_ENV === 'production' ? 'https://gtimes.in' : '';
  res.type('text/plain').send(`User-agent: *\nDisallow: /api/\nDisallow: /admin/\nSitemap: ${domain}/sitemap.xml\n`);
};
