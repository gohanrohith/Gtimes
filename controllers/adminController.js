const bcrypt  = require('bcrypt');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const https   = require('https');
const { syncGoogleReviews } = require('../services/googleReviews');
const { query, queryOne } = require('../config/db');
const { slugify }         = require('../utils/slug');
const { isValidImage }    = require('../utils/magicBytes');
const { readingTime }     = require('../utils/readingTime');

// ── Multer helpers ─────────────────────────────────────
const UPLOADS_BASE = process.env.UPLOADS_DIR || path.join(__dirname, '../public/uploads');

function makeStorage(dest) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOADS_BASE, dest)),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
}

const imgFilter = (req, file, cb) => {
  const ok = /jpeg|jpg|png|gif|webp/.test(file.mimetype);
  cb(ok ? null : new Error('Images only'), ok);
};

// Single cover image upload (articles, events)
function singleImageUpload(dest, fieldName = 'cover_image') {
  return multer({ storage: makeStorage(dest), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imgFilter })
    .array(fieldName, 1);
}

// Multi-image upload (gallery)
function multiImageUpload(dest, maxCount = 20) {
  return multer({ storage: makeStorage(dest), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imgFilter })
    .array('images', maxCount);
}

const articleUpload    = singleImageUpload('articles', 'cover_image');
const articleImgUpload = multer({ storage: makeStorage('articles'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imgFilter }).single('image');
const galleryUpload    = multer({ storage: makeStorage('gallery'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imgFilter }).array('photos', 20);
const eventUpload      = singleImageUpload('events', 'cover_image');

// ── DB helpers ─────────────────────────────────────────
async function q(sql, params = []) {
  try { return await query(sql, params); } catch (e) { console.error(e.message); return []; }
}
async function q1(sql, params = []) { const r = await q(sql, params); return r[0] || null; }

// ── Settings helper ────────────────────────────────────
async function getSettings() {
  const rows = await q('SELECT setting_key, value FROM settings');
  const m = {};
  rows.forEach(r => { m[r.setting_key] = r.value; });
  return m;
}
async function getCategories() {
  return q('SELECT * FROM categories ORDER BY sort_order ASC');
}

// ── Webhook: notify Greenwood on publish ───────────────
function notifyGreenwood(type, action, campus, data) {
  const url = process.env.GREENWOOD_WEBHOOK_URL;
  const secret = process.env.GREENWOOD_WEBHOOK_SECRET;
  if (!url || !secret) { console.log('[GHS Webhook] Skipped — URL or secret not set'); return; }
  const payload = JSON.stringify({ type, action, campus, data, secret });
  try {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => console.log(`[GHS Webhook] ${type}/${action} → ${res.statusCode} ${body.substring(0,120)}`));
    });
    req.on('error', e => console.error('[GHS Webhook] Error:', e.message));
    req.write(payload);
    req.end();
  } catch (e) { console.error('[GHS Webhook] Exception:', e.message); }
}

// ── Unique slug helper ─────────────────────────────────
async function makeSlug(title, table, excludeId = null) {
  let base = slugify(title);
  let slug = base;
  let i = 2;
  while (true) {
    const sql = excludeId
      ? `SELECT id FROM ${table} WHERE slug=? AND id != ?`
      : `SELECT id FROM ${table} WHERE slug=?`;
    const params = excludeId ? [slug, excludeId] : [slug];
    const exists = await q1(sql, params);
    if (!exists) return slug;
    slug = `${base}-${i++}`;
  }
}

// ── Tag helper ─────────────────────────────────────────
async function saveTags(articleId, tagsInput) {
  await q('DELETE FROM article_tags WHERE article_id=?', [articleId]);
  if (!tagsInput || !tagsInput.trim()) return;
  const names = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
  for (const name of names) {
    const slug = slugify(name);
    await q('INSERT IGNORE INTO tags (name, slug) VALUES (?,?)', [name, slug]);
    const tag = await q1('SELECT id FROM tags WHERE slug=?', [slug]);
    if (tag) await q('INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?,?)', [articleId, tag.id]);
  }
}

async function getArticleTags(articleId) {
  return q('SELECT t.* FROM tags t JOIN article_tags at ON at.tag_id=t.id WHERE at.article_id=?', [articleId]);
}

// ── Auth ───────────────────────────────────────────────
exports.loginPage = (req, res) => {
  if (req.session.adminId) return res.redirect('/admin');
  res.render('admin/login', { title: 'Admin Login | GTimes', error: null });
};

exports.loginSubmit = async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await queryOne('SELECT * FROM admins WHERE username=?', [username]);
    if (admin && await bcrypt.compare(password, admin.password)) {
      req.session.adminId   = admin.id;
      req.session.adminName = admin.name;
      req.session.adminRole = admin.role;
      return res.redirect('/admin');
    }
  } catch { /* DB not ready */ }
  res.render('admin/login', { title: 'Admin Login | GTimes', error: 'Invalid credentials' });
};

exports.logout = (req, res) => req.session.destroy(() => res.redirect('/admin/login'));

// ── Dashboard ──────────────────────────────────────────
exports.dashboard = async (req, res) => {
  const [articles, pendingCommentCount, events, photos, reviewCount] = await Promise.all([
    q1('SELECT COUNT(*) AS c FROM articles WHERE status=?', ['published']),
    q1('SELECT COUNT(*) AS c FROM comments WHERE status=?', ['pending']),
    q1('SELECT COUNT(*) AS c FROM events'),
    q1('SELECT COUNT(*) AS c FROM gallery_photos'),
    q1('SELECT COUNT(*) AS c FROM articles WHERE status=?', ['review']),
  ]);
  const recentArticles = await q(`SELECT a.*, c.name AS cat_name FROM articles a LEFT JOIN categories c ON a.category_id=c.id ORDER BY a.created_at DESC LIMIT 6`);
  const pendingComments = await q(`SELECT cm.*, a.title AS article_title, a.slug AS article_slug FROM comments cm JOIN articles a ON cm.article_id=a.id WHERE cm.status='pending' ORDER BY cm.created_at DESC LIMIT 5`);
  const reviewArticles = await q(`SELECT a.*, adm.name AS creator_name FROM articles a LEFT JOIN admins adm ON a.created_by=adm.id WHERE a.status='review' ORDER BY a.updated_at DESC LIMIT 5`);
  res.render('admin/dashboard', {
    title: 'Dashboard | GTimes Admin',
    admin: { username: req.session.adminName },
    stats: {
      articles: articles?.c || 0,
      pending_comments: pendingCommentCount?.c || 0,
      events: events?.c || 0,
      photos: photos?.c || 0,
      review: reviewCount?.c || 0,
    },
    recentArticles, pendingComments, reviewArticles,
  });
};

// ── Articles ───────────────────────────────────────────
exports.articlesList = async (req, res) => {
  const { status, q: search } = req.query;
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  let sql = `SELECT a.*, c.name AS cat_name, c.color AS cat_color
             FROM articles a
             LEFT JOIN categories c ON a.category_id=c.id
             WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND a.status=?'; params.push(status); }
  if (search) { sql += ' AND a.title LIKE ?'; params.push(`%${search}%`); }
  const countSql = sql.replace('SELECT a.*, c.name AS cat_name, c.color AS cat_color', 'SELECT COUNT(*) AS c');
  sql += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
  const [articles, total, categories] = await Promise.all([
    q(sql, [...params, limit, offset]),
    q1(countSql, params),
    getCategories(),
  ]);
  const totalPages = Math.ceil((total?.c || 0) / limit);
  res.render('admin/articles', {
    title: 'Articles | GTimes Admin',
    articles, categories,
    filter: status || '', search: search || '',
    pagination: { page, totalPages },
    admin: { username: req.session.adminName },
    error: req.query.error || null,
  });
};

exports.getGalleriesJson = async (req, res) => {
  const albums = await q(
    `SELECT ga.id, ga.title, ga.cover_image, COUNT(gp.id) AS photo_count
     FROM gallery_albums ga LEFT JOIN gallery_photos gp ON gp.album_id=ga.id
     WHERE ga.is_active=1 GROUP BY ga.id ORDER BY ga.created_at DESC`
  );
  res.json(albums);
};

exports.uploadArticleImage = (req, res) => {
  articleImgUpload(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    const fp = path.join(UPLOADS_BASE, 'articles', req.file.filename);
    if (!isValidImage(fp)) {
      fs.unlinkSync(fp);
      return res.status(400).json({ error: 'Invalid image file' });
    }
    res.json({ url: `/uploads/articles/${req.file.filename}` });
  });
};

exports.articleForm = async (req, res) => {
  const categories = await getCategories();
  res.render('admin/article-form', { title: 'New Article | GTimes Admin', article: null, categories, articleTags: '', admin: { username: req.session.adminName }, error: req.query.error || null });
};

exports.createArticle = (req, res) => {
  articleUpload(req, res, async err => {
    if (err) return res.redirect('/admin/articles/new?error=' + encodeURIComponent(err.message));
    const { title, excerpt, content, content_hi, content_te, category_id, author_name, featured, scheduled_at } = req.body;
    if (!title) return res.redirect('/admin/articles/new?error=Title+is+required');

    let cover = null;
    if (req.files?.[0]) {
      const fp = path.join(UPLOADS_BASE, 'articles', req.files[0].filename);
      if (isValidImage(fp)) { cover = req.files[0].filename; }
      else { fs.unlinkSync(fp); }
    }
    const slug = await makeSlug(title, 'articles');
    const shortSlug = req.body.short_slug ? req.body.short_slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '') : null;
    const schedDate = scheduled_at ? new Date(scheduled_at) : null;
    const validSched = schedDate && !isNaN(schedDate) ? schedDate : null;
    let result;
    try {
      result = await query(
        `INSERT INTO articles (title, slug, short_slug, excerpt, content, content_hi, content_te, cover_image, category_id, author_name, featured, scheduled_at, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [title, slug, shortSlug || null, excerpt || null, content || null, content_hi || null, content_te || null,
         cover, category_id || null, author_name || 'GTimes Staff', featured === '1' ? 1 : 0,
         validSched, req.session.adminId]);
    } catch (dbErr) {
      console.error('createArticle:', dbErr.message);
      return res.redirect('/admin/articles/new?error=' + encodeURIComponent(dbErr.message));
    }
    if (result.insertId && req.body.tags) {
      await saveTags(result.insertId, req.body.tags);
    }
    res.redirect('/admin/articles');
  });
};

exports.editArticleForm = async (req, res) => {
  const [article, categories, tags] = await Promise.all([
    q1('SELECT * FROM articles WHERE id=?', [req.params.id]),
    getCategories(),
    getArticleTags(req.params.id),
  ]);
  if (!article) return res.redirect('/admin/articles');
  const articleTags = tags.map(t => t.name).join(', ');
  res.render('admin/article-form', { title: 'Edit Article | GTimes Admin', article, categories, articleTags, admin: { username: req.session.adminName }, error: req.query.error || null });
};

exports.updateArticle = (req, res) => {
  articleUpload(req, res, async err => {
    if (err) return res.redirect(`/admin/articles/${req.params.id}/edit?error=` + encodeURIComponent(err.message));
    const { title, excerpt, content, content_hi, content_te, category_id, author_name, featured } = req.body;
    const article = await q1('SELECT * FROM articles WHERE id=?', [req.params.id]);
    if (!article) return res.redirect('/admin/articles');

    let cover = article.cover_image;
    if (req.body.remove_cover === '1' && cover) {
      const old = path.join(UPLOADS_BASE, 'articles', cover);
      if (fs.existsSync(old)) fs.unlinkSync(old);
      cover = null;
    }
    if (req.files?.[0]) {
      const fp = path.join(UPLOADS_BASE, 'articles', req.files[0].filename);
      if (isValidImage(fp)) { cover = req.files[0].filename; }
      else { fs.unlinkSync(fp); }
    }
    const slug = title !== article.title ? await makeSlug(title, 'articles', article.id) : article.slug;
    const shortSlug = req.body.short_slug ? req.body.short_slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '') : null;
    const { scheduled_at } = req.body;
    const schedDate = scheduled_at ? new Date(scheduled_at) : null;
    const validSched = schedDate && !isNaN(schedDate) ? schedDate : null;
    try {
      await query(`UPDATE articles SET title=?, slug=?, short_slug=?, excerpt=?, content=?, content_hi=?, content_te=?, cover_image=?, category_id=?, author_name=?, featured=?, scheduled_at=? WHERE id=?`,
        [title, slug, shortSlug || null, excerpt || null, content || null, content_hi || null, content_te || null,
         cover, category_id || null, author_name || 'GTimes Staff', featured === '1' ? 1 : 0,
         validSched, req.params.id]);
    } catch (dbErr) {
      console.error('updateArticle:', dbErr.message);
      return res.redirect(`/admin/articles/${req.params.id}/edit?error=` + encodeURIComponent(dbErr.message));
    }
    if (req.body.tags !== undefined) {
      await saveTags(req.params.id, req.body.tags);
    }
    if (req.body.also_publish === '1' && ['editor', 'super'].includes(req.session.adminRole)) {
      const now = new Date();
      await q(`UPDATE articles SET status='published', published_at=COALESCE(published_at,?), scheduled_at=NULL WHERE id=?`, [now, req.params.id]);
      notifyGreenwood('article', 'publish', 'all', {
        gtimes_id:    String(req.params.id),
        title,
        excerpt:      excerpt || null,
        gtimes_url:   `https://gtimes.in/article/${slug}`,
        category:     'news',
        image_url:    cover ? `https://gtimes.in/uploads/articles/${cover}` : null,
        published_at: now.toISOString(),
      });
    }
    res.redirect('/admin/articles');
  });
};

exports.submitForReview = async (req, res) => {
  await q(`UPDATE articles SET status='review' WHERE id=?`, [req.params.id]);
  res.redirect('/admin/articles');
};

exports.publishArticle = async (req, res) => {
  if (!['editor', 'super'].includes(req.session.adminRole)) {
    return res.redirect('/admin/articles?error=Only+editors+and+super+admins+can+publish');
  }
  const article = await q1(
    `SELECT a.*, c.name AS cat_name FROM articles a LEFT JOIN categories c ON a.category_id=c.id WHERE a.id=?`,
    [req.params.id]);
  if (!article) return res.redirect('/admin/articles');
  const now = new Date();
  await q(`UPDATE articles SET status='published', published_at=COALESCE(published_at,?), scheduled_at=NULL WHERE id=?`, [now, article.id]);
  notifyGreenwood('article', 'publish', 'all', {
    gtimes_id:   String(article.id),
    title:       article.title,
    excerpt:     article.excerpt,
    gtimes_url:  `https://gtimes.in/article/${article.slug}`,
    category:    article.cat_name || 'news',
    image_url:   article.cover_image ? `https://gtimes.in/uploads/articles/${article.cover_image}` : null,
    published_at: now.toISOString(),
  });
  res.redirect('/admin/articles');
};

exports.resyncArticle = async (req, res) => {
  const article = await q1(
    `SELECT a.*, c.name AS cat_name FROM articles a LEFT JOIN categories c ON a.category_id=c.id WHERE a.id=? AND a.status='published'`,
    [req.params.id]);
  if (!article) return res.redirect('/admin/articles?error=Article+not+found+or+not+published');
  notifyGreenwood('article', 'publish', 'all', {
    gtimes_id:    String(article.id),
    title:        article.title,
    excerpt:      article.excerpt,
    gtimes_url:   `https://gtimes.in/article/${article.slug}`,
    category:     article.cat_name || 'news',
    image_url:    article.cover_image ? `https://gtimes.in/uploads/articles/${article.cover_image}` : null,
    published_at: new Date(article.published_at).toISOString(),
  });
  res.redirect('/admin/articles?success=Resynced+to+GHS');
};

exports.unpublishArticle = async (req, res) => {
  await q(`UPDATE articles SET status='draft', scheduled_at=NULL WHERE id=?`, [req.params.id]);
  res.redirect('/admin/articles');
};

exports.deleteArticle = async (req, res) => {
  await q('DELETE FROM articles WHERE id=?', [req.params.id]);
  res.redirect('/admin/articles');
};

// ── Events ─────────────────────────────────────────────
exports.eventsList = async (req, res) => {
  const campus = req.query.campus || '';
  const campusFilter = campus ? ' AND (campus=? OR campus="all" OR campus IS NULL)' : '';
  const events = await q(
    `SELECT * FROM events${campusFilter ? ' WHERE 1=1' + campusFilter : ''} ORDER BY event_date DESC`,
    campus ? [campus] : []
  );
  res.render('admin/events', { title: 'Events | GTimes Admin', events, activeCampus: campus, success: req.query.success || null });
};

exports.eventForm = async (req, res) => {
  res.render('admin/event-form', { title: 'New Event | GTimes Admin', event: null });
};

exports.createEvent = (req, res) => {
  eventUpload(req, res, async err => {
    if (err) return res.redirect('/admin/events/new?error=' + encodeURIComponent(err.message));
    const { title, description, location, event_date, event_time, campus, status, featured } = req.body;
    if (!title) return res.redirect('/admin/events/new?error=Title+is+required');
    let cover = null;
    if (req.files?.[0]) {
      const fp = path.join(UPLOADS_BASE, 'events', req.files[0].filename);
      if (isValidImage(fp)) { cover = req.files[0].filename; }
      else { fs.unlinkSync(fp); }
    }
    const slug = await makeSlug(title, 'events');
    await q(`INSERT INTO events (title, slug, description, cover_image, location, event_date, event_time, campus, status, featured, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [title, slug, description || null, cover, location || null,
       event_date || null, event_time || null, campus || 'all',
       status || 'upcoming', featured === '1' ? 1 : 0, req.session.adminId]);
    notifyGreenwood('event', 'publish', campus || 'all', {
      gtimes_id:   slug,
      title,
      description: description || null,
      gtimes_url:  `https://gtimes.in/events`,
      event_date:  event_date || null,
      category:    'general',
    });
    res.redirect('/admin/events');
  });
};

exports.editEventForm = async (req, res) => {
  const event = await q1('SELECT * FROM events WHERE id=?', [req.params.id]);
  if (!event) return res.redirect('/admin/events');
  res.render('admin/event-form', { title: 'Edit Event | GTimes Admin', event });
};

exports.updateEvent = (req, res) => {
  eventUpload(req, res, async err => {
    if (err) return res.redirect(`/admin/events/${req.params.id}/edit?error=` + encodeURIComponent(err.message));
    const ev = await q1('SELECT * FROM events WHERE id=?', [req.params.id]);
    if (!ev) return res.redirect('/admin/events');
    const { title, description, location, event_date, event_time, campus, status, featured } = req.body;
    if (!title) return res.redirect(`/admin/events/${req.params.id}/edit?error=Title+is+required`);
    let cover = ev.cover_image;
    if (req.files?.[0]) {
      const fp = path.join(UPLOADS_BASE, 'events', req.files[0].filename);
      if (isValidImage(fp)) { cover = req.files[0].filename; }
      else { fs.unlinkSync(fp); }
    }
    await q(`UPDATE events SET title=?, description=?, cover_image=?, location=?, event_date=?, event_time=?, campus=?, status=?, featured=? WHERE id=?`,
      [title, description || null, cover, location || null, event_date || null,
       event_time || null, campus || 'all', status || 'upcoming', featured === '1' ? 1 : 0, ev.id]);
    res.redirect('/admin/events');
  });
};

exports.deleteEvent = async (req, res) => {
  await q('DELETE FROM events WHERE id=?', [req.params.id]);
  res.redirect('/admin/events');
};

// ── Gallery ────────────────────────────────────────────
exports.galleryList = async (req, res) => {
  const campus = req.query.campus || '';
  const campusFilter = campus ? ' AND (ga.campus=? OR ga.campus="all" OR ga.campus IS NULL)' : '';
  const albums = await q(
    `SELECT ga.*, COUNT(gp.id) AS photo_count
     FROM gallery_albums ga LEFT JOIN gallery_photos gp ON gp.album_id=ga.id
     WHERE ga.is_active=1${campusFilter} GROUP BY ga.id ORDER BY ga.created_at DESC`,
    campus ? [campus] : []
  );
  res.render('admin/gallery', {
    title: 'Gallery | GTimes Admin', albums,
    activeCampus: campus,
    success: req.query.success || null,
  });
};

exports.albumForm = (req, res) => {
  res.render('admin/album-form', { title: 'New Album | GTimes Admin', album: null, photos: [] });
};

exports.albumUploadForm = async (req, res) => {
  const album = await q1('SELECT * FROM gallery_albums WHERE id=? AND is_active=1', [req.params.id]);
  if (!album) return res.redirect('/admin/gallery');
  const photos = await q('SELECT * FROM gallery_photos WHERE album_id=? ORDER BY sort_order ASC, created_at ASC', [album.id]);
  res.render('admin/album-form', { title: `Upload Photos | ${album.title} | GTimes Admin`, album, photos });
};

exports.createAlbum = async (req, res) => {
  const { title, description, campus } = req.body;
  if (!title) return res.redirect('/admin/gallery/new?error=Title+required');
  const slug = await makeSlug(title, 'gallery_albums');
  await q(`INSERT INTO gallery_albums (title, slug, description, campus, created_by) VALUES (?,?,?,?,?)`,
    [title, slug, description || null, campus || 'all', req.session.adminId]);
  res.redirect('/admin/gallery');
};

exports.uploadPhotos = (req, res) => {
  galleryUpload(req, res, async err => {
    if (err) return res.redirect(`/admin/gallery?error=` + encodeURIComponent(err.message));
    const albumId = req.params.id;
    let uploaded = 0;
    for (const file of (req.files || [])) {
      const fp = path.join(UPLOADS_BASE, 'gallery', file.filename);
      if (!isValidImage(fp)) { fs.unlinkSync(fp); continue; }
      await q('INSERT INTO gallery_photos (album_id, filename, caption) VALUES (?,?,?)',
        [albumId, file.filename, req.body.caption || null]);
      uploaded++;
    }
    // Set first photo as cover if album has none
    const album = await q1('SELECT * FROM gallery_albums WHERE id=?', [albumId]);
    if (album && !album.cover_image && uploaded > 0) {
      const first = await q1('SELECT filename FROM gallery_photos WHERE album_id=? ORDER BY created_at ASC LIMIT 1', [albumId]);
      if (first) await q('UPDATE gallery_albums SET cover_image=? WHERE id=?', [first.filename, albumId]);
    }
    res.redirect('/admin/gallery');
  });
};

exports.deleteAlbum = async (req, res) => {
  await q('UPDATE gallery_albums SET is_active=0 WHERE id=?', [req.params.id]);
  res.redirect('/admin/gallery');
};

exports.deletePhoto = async (req, res) => {
  const photo = await q1('SELECT * FROM gallery_photos WHERE id=?', [req.params.id]);
  if (photo) {
    const fp = path.join(UPLOADS_BASE, 'gallery', photo.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    await q('DELETE FROM gallery_photos WHERE id=?', [photo.id]);
  }
  res.redirect('back');
};

// ── Videos ────────────────────────────────────────────
exports.videosList = async (req, res) => {
  const videos = await q('SELECT * FROM videos ORDER BY created_at DESC');
  res.render('admin/videos', { title: 'Videos | GTimes Admin', videos, success: req.query.success || null, error: req.query.error || null });
};

exports.createVideo = async (req, res) => {
  const { title, description, youtube_url, category, featured, status } = req.body;
  if (!title || !youtube_url) return res.redirect('/admin/videos?error=Title+and+URL+required');
  const ytMatch = youtube_url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  const ytId = ytMatch ? ytMatch[1] : null;
  await q(`INSERT INTO videos (title, description, youtube_url, youtube_id, category, featured, status, created_by)
           VALUES (?,?,?,?,?,?,?,?)`,
    [title, description || null, youtube_url, ytId, category || 'general',
     featured === '1' ? 1 : 0, status || 'published', req.session.adminId]);
  res.redirect('/admin/videos');
};

exports.deleteVideo = async (req, res) => {
  await q('DELETE FROM videos WHERE id=?', [req.params.id]);
  res.redirect('/admin/videos');
};

// ── Comments ───────────────────────────────────────────
exports.commentsList = async (req, res) => {
  const { status } = req.query;
  let sql = `SELECT cm.*, a.title AS article_title, a.slug AS article_slug FROM comments cm JOIN articles a ON cm.article_id=a.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND cm.status=?'; params.push(status); }
  sql += ' ORDER BY cm.created_at DESC LIMIT 100';
  const pendingCount = await q1(`SELECT COUNT(*) AS c FROM comments WHERE status='pending'`);
  const comments = await q(sql, params);
  res.render('admin/comments', {
    title: 'Comments | GTimes Admin',
    comments, filter: status || '',
    pendingCount: pendingCount?.c || 0,
    admin: { username: req.session.adminName },
  });
};

exports.approveComment = async (req, res) => {
  await q(`UPDATE comments SET status='approved' WHERE id=?`, [req.params.id]);
  res.redirect('/admin/comments?status=pending');
};

exports.spamComment = async (req, res) => {
  await q(`UPDATE comments SET status='spam' WHERE id=?`, [req.params.id]);
  res.redirect('/admin/comments');
};

exports.deleteComment = async (req, res) => {
  await q('DELETE FROM comments WHERE id=?', [req.params.id]);
  res.redirect('/admin/comments');
};

// ── Settings ───────────────────────────────────────────
exports.settings = async (req, res) => {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  res.render('admin/settings', {
    title: 'Settings | GTimes Admin',
    settings, categories,
    success: req.query.success || null,
    error:   req.query.error   || null,
  });
};

exports.syncGoogleReviews = async (req, res) => {
  try {
    const settingsRows = await q('SELECT setting_key, value FROM settings WHERE setting_key IN (?,?)',
      ['google_place_id', 'google_places_api_key']);
    const sm = {};
    settingsRows.forEach(s => { sm[s.setting_key] = s.value; });
    if (!sm.google_place_id || !sm.google_places_api_key) {
      return res.redirect('/admin/settings?error=Set+Google+Place+ID+and+API+Key+first');
    }
    const result = await syncGoogleReviews(sm.google_place_id, sm.google_places_api_key, q);
    if (result.overallRating) {
      await q('INSERT INTO settings (setting_key,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
        ['google_overall_rating', String(result.overallRating), String(result.overallRating)]);
      await q('INSERT INTO settings (setting_key,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
        ['google_total_ratings', String(result.totalRatings), String(result.totalRatings)]);
    }
    res.redirect(`/admin/settings?success=Synced+${result.synced}+new+reviews`);
  } catch (err) {
    res.redirect(`/admin/settings?error=${encodeURIComponent(err.message)}`);
  }
};

exports.saveSettings = async (req, res) => {
  const { site_name, site_tagline, contact_email,
          facebook, instagram, youtube, twitter, whatsapp, breaking_news,
          google_place_id, google_places_api_key,
          comments_enabled, comments_moderation,
          current_password, new_password, confirm_password } = req.body;

  const kvPairs = {
    site_name, site_tagline, contact_email,
    facebook: facebook || '', instagram: instagram || '', youtube: youtube || '', twitter: twitter || '', whatsapp: whatsapp || '',
    breaking_news: breaking_news || '',
    comments_enabled: comments_enabled ? '1' : '0',
    comments_moderation: comments_moderation ? '1' : '0',
    google_place_id: google_place_id || '',
    google_places_api_key: google_places_api_key || '',
  };
  for (const [k, v] of Object.entries(kvPairs)) {
    if (v !== undefined) {
      await q('INSERT INTO settings (setting_key, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?', [k, v, v]);
    }
  }

  if (new_password) {
    if (new_password !== confirm_password) return res.redirect('/admin/settings?error=Passwords+do+not+match');
    const admin = await q1('SELECT password FROM admins WHERE id=?', [req.session.adminId]);
    if (!admin || !await bcrypt.compare(current_password, admin.password)) {
      return res.redirect('/admin/settings?error=Wrong+current+password');
    }
    const hash = await bcrypt.hash(new_password, 10);
    await q('UPDATE admins SET password=? WHERE id=?', [hash, req.session.adminId]);
  }

  res.redirect('/admin/settings?success=1');
};

// ── Newsletter admin ────────────────────────────────────
exports.newsletterList = async (req, res) => {
  const subscribers = await q('SELECT * FROM newsletter_subscribers ORDER BY created_at DESC');
  res.render('admin/newsletter', {
    title: 'Newsletter | GTimes Admin',
    subscribers,
    admin: { username: req.session.adminName },
    success: req.query.success || null,
    error:   req.query.error   || null,
  });
};

exports.deleteSubscriber = async (req, res) => {
  await q('DELETE FROM newsletter_subscribers WHERE id=?', [req.params.id]);
  res.redirect('/admin/newsletter');
};

exports.exportSubscribers = async (req, res) => {
  const subscribers = await q('SELECT email, name, created_at FROM newsletter_subscribers ORDER BY created_at DESC');
  const lines = ['email,name,subscribed_at'];
  subscribers.forEach(s => {
    const email = `"${(s.email || '').replace(/"/g, '""')}"`;
    const name  = `"${(s.name  || '').replace(/"/g, '""')}"`;
    const date  = new Date(s.created_at).toISOString().split('T')[0];
    lines.push(`${email},${name},${date}`);
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="gtimes-subscribers.csv"');
  res.send(lines.join('\r\n'));
};

exports.sendNewsletter = async (req, res) => {
  const { subject, html_body } = req.body;
  if (!subject || !html_body) return res.redirect('/admin/newsletter?error=Subject+and+body+are+required');
  try {
    const subscribers = await q('SELECT email, token FROM newsletter_subscribers ORDER BY created_at DESC');
    if (!subscribers.length) return res.redirect('/admin/newsletter?error=No+subscribers+yet');
    const { sendBroadcast } = require('../config/mailer');
    const domain = process.env.NODE_ENV === 'production' ? 'https://gtimes.in' : `http://localhost:${process.env.PORT || 3001}`;
    const sent = await sendBroadcast({ subject, htmlBody: html_body, subscribers, siteUrl: domain });
    res.redirect(`/admin/newsletter?success=Sent+to+${sent}+subscriber${sent !== 1 ? 's' : ''}`);
  } catch (err) {
    res.redirect(`/admin/newsletter?error=${encodeURIComponent(err.message)}`);
  }
};

// ── Gallery extras ──────────────────────────────────────
exports.updatePhotoCaption = async (req, res) => {
  const { caption } = req.body;
  await q('UPDATE gallery_photos SET caption=? WHERE id=?', [caption?.trim() || null, req.params.id]);
  res.redirect('back');
};

exports.setAlbumCover = async (req, res) => {
  const photo = await q1('SELECT filename, album_id FROM gallery_photos WHERE id=? AND album_id=?', [req.params.photoId, req.params.id]);
  if (photo) await q('UPDATE gallery_albums SET cover_image=? WHERE id=?', [photo.filename, req.params.id]);
  res.redirect('back');
};

// ── Article preview (draft preview for admin) ──────────
exports.previewArticle = async (req, res) => {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const article = await q1(
    `SELECT a.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color,
            adm.username AS author_username, adm.bio AS author_bio, adm.avatar AS author_avatar
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN admins adm ON a.created_by = adm.id
     WHERE a.id=?`, [req.params.id]);
  if (!article) return res.redirect('/admin/articles');
  const tags = await getArticleTags(req.params.id);
  const domain = process.env.NODE_ENV === 'production' ? 'https://gtimes.in' : `http://localhost:${process.env.PORT || 3001}`;
  const { readingTime } = require('../utils/readingTime');
  res.render('main/article', {
    title: `[Preview] ${article.title}`,
    settings, categories,
    article: { ...article, reading_time: readingTime(article.content) },
    comments: [], related: [], tags,
    success: null, error: null,
    domain,
    canonicalUrl: `${domain}/article/${article.slug}`,
    shortUrl: `${domain}/p/${article.short_slug || article.id}`,
    isPreview: true,
  });
};

// ── Users management (super only) ───────────────────────
const adminAvatarUpload = multer({ storage: makeStorage('avatars'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imgFilter }).array('images', 1);

exports.usersList = async (req, res) => {
  const users = await q('SELECT id, username, name, role, bio, avatar, created_at FROM admins ORDER BY created_at ASC');
  res.render('admin/users', {
    title: 'Users | GTimes Admin',
    users,
    admin: { username: req.session.adminName },
    success: req.query.success || null,
  });
};

exports.userForm = (req, res) => {
  res.render('admin/user-form', {
    title: 'New User | GTimes Admin',
    user: null,
    admin: { username: req.session.adminName },
    error: req.query.error || null,
  });
};

exports.createUser = async (req, res) => {
  const { username, name, password, role } = req.body;
  if (!username || !name || !password) return res.redirect('/admin/users/new?error=All+fields+required');
  const exists = await q1('SELECT id FROM admins WHERE username=?', [username]);
  if (exists) return res.redirect('/admin/users/new?error=Username+already+taken');
  const hash = await bcrypt.hash(password, 10);
  await q('INSERT INTO admins (username, name, password, role) VALUES (?,?,?,?)',
    [username.trim(), name.trim(), hash, role || 'author']);
  res.redirect('/admin/users?success=1');
};

exports.editUserForm = async (req, res) => {
  const user = await q1('SELECT id, username, name, role, bio, avatar FROM admins WHERE id=?', [req.params.id]);
  if (!user) return res.redirect('/admin/users');
  res.render('admin/user-form', {
    title: 'Edit User | GTimes Admin',
    user,
    admin: { username: req.session.adminName },
    error: req.query.error || null,
  });
};

exports.updateUser = async (req, res) => {
  const { name, role, new_password } = req.body;
  const targetId = parseInt(req.params.id);
  const isSelf = targetId === req.session.adminId;
  const safeRole = isSelf ? 'super' : (role || 'author');
  await q('UPDATE admins SET name=?, role=? WHERE id=?', [name, safeRole, targetId]);
  if (new_password && new_password.length >= 8) {
    const hash = await bcrypt.hash(new_password, 10);
    await q('UPDATE admins SET password=? WHERE id=?', [hash, targetId]);
  }
  if (isSelf) req.session.adminName = name;
  res.redirect('/admin/users?success=1');
};

exports.deleteUser = async (req, res) => {
  if (parseInt(req.params.id) === req.session.adminId) return res.redirect('/admin/users');
  await q('DELETE FROM admins WHERE id=?', [req.params.id]);
  res.redirect('/admin/users');
};

// ── Profile (own bio + avatar) ───────────────────────────
exports.profileForm = async (req, res) => {
  const admin = await q1('SELECT id, username, name, bio, avatar, role FROM admins WHERE id=?', [req.session.adminId]);
  res.render('admin/profile', {
    title: 'My Profile | GTimes Admin',
    adminUser: admin,
    admin: { username: req.session.adminName },
    success: req.query.success || null,
  });
};

exports.saveProfile = (req, res) => {
  adminAvatarUpload(req, res, async err => {
    if (err) return res.redirect('/admin/profile?error=' + encodeURIComponent(err.message));
    const { name, bio } = req.body;
    let avatar = null;
    if (req.files?.[0]) {
      const fp = path.join(UPLOADS_BASE, 'avatars', req.files[0].filename);
      if (isValidImage(fp)) { avatar = req.files[0].filename; }
      else { fs.unlinkSync(fp); }
    }
    if (avatar) {
      await q('UPDATE admins SET name=?, bio=?, avatar=? WHERE id=?', [name, bio || null, avatar, req.session.adminId]);
    } else {
      await q('UPDATE admins SET name=?, bio=? WHERE id=?', [name, bio || null, req.session.adminId]);
    }
    req.session.adminName = name;
    res.redirect('/admin/profile?success=1');
  });
};

// ── Categories management ──────────────────────────────
exports.categoriesList = async (req, res) => {
  const categories = await q(
    `SELECT c.*, COUNT(a.id) AS article_count
     FROM categories c LEFT JOIN articles a ON a.category_id=c.id
     GROUP BY c.id ORDER BY c.sort_order ASC`
  );
  res.render('admin/categories', {
    title: 'Categories | GTimes Admin',
    categories,
    success: req.query.success || null,
    error:   req.query.error   || null,
  });
};

exports.categoryForm = (req, res) => {
  res.render('admin/category-form', {
    title: 'New Category | GTimes Admin',
    category: null,
    error: req.query.error || null,
  });
};

exports.createCategory = async (req, res) => {
  const { name, description, color, sort_order } = req.body;
  if (!name) return res.redirect('/admin/categories/new?error=Name+is+required');
  const slug = await makeSlug(name, 'categories');
  await q('INSERT INTO categories (name, slug, description, color, sort_order) VALUES (?,?,?,?,?)',
    [name.trim(), slug, description || null, color || '#00663A', parseInt(sort_order) || 0]);
  res.redirect('/admin/categories?success=1');
};

exports.editCategoryForm = async (req, res) => {
  const category = await q1('SELECT * FROM categories WHERE id=?', [req.params.id]);
  if (!category) return res.redirect('/admin/categories');
  res.render('admin/category-form', {
    title: 'Edit Category | GTimes Admin',
    category,
    error: req.query.error || null,
  });
};

exports.updateCategory = async (req, res) => {
  const { name, description, color, sort_order } = req.body;
  if (!name) return res.redirect(`/admin/categories/${req.params.id}/edit?error=Name+is+required`);
  const cat = await q1('SELECT * FROM categories WHERE id=?', [req.params.id]);
  if (!cat) return res.redirect('/admin/categories');
  const slug = name !== cat.name ? await makeSlug(name, 'categories', cat.id) : cat.slug;
  await q('UPDATE categories SET name=?, slug=?, description=?, color=?, sort_order=? WHERE id=?',
    [name.trim(), slug, description || null, color || '#00663A', parseInt(sort_order) || 0, req.params.id]);
  res.redirect('/admin/categories?success=1');
};

exports.deleteCategory = async (req, res) => {
  await q('UPDATE articles SET category_id=NULL WHERE category_id=?', [req.params.id]);
  await q('DELETE FROM categories WHERE id=?', [req.params.id]);
  res.redirect('/admin/categories?success=1');
};

// ── Tags management ────────────────────────────────────
exports.tagsList = async (req, res) => {
  const tags = await q(
    `SELECT t.*, COUNT(at.article_id) AS article_count
     FROM tags t LEFT JOIN article_tags at ON at.tag_id=t.id
     GROUP BY t.id ORDER BY article_count DESC, t.name ASC`
  );
  res.render('admin/tags', {
    title: 'Tags | GTimes Admin',
    tags,
    success: req.query.success || null,
  });
};

exports.deleteTag = async (req, res) => {
  await q('DELETE FROM tags WHERE id=?', [req.params.id]);
  res.redirect('/admin/tags?success=1');
};

// ── Analytics ──────────────────────────────────────────
exports.analytics = async (req, res) => {
  const [
    articlesByStatus, totalViews, topArticles,
    byCategory, subscribers, pendingComments,
    totalEvents, totalPhotos, totalVideos,
  ] = await Promise.all([
    q('SELECT status, COUNT(*) AS c FROM articles GROUP BY status'),
    q1('SELECT COALESCE(SUM(views),0) AS total FROM articles WHERE status="published"'),
    q(`SELECT a.title, a.slug, a.views, a.published_at, c.name AS cat_name, c.color AS cat_color
       FROM articles a LEFT JOIN categories c ON a.category_id=c.id
       WHERE a.status='published' ORDER BY a.views DESC LIMIT 10`),
    q(`SELECT c.name, c.color, COUNT(a.id) AS cnt
       FROM categories c LEFT JOIN articles a ON a.category_id=c.id AND a.status='published'
       GROUP BY c.id ORDER BY cnt DESC`),
    q1('SELECT COUNT(*) AS c FROM newsletter_subscribers'),
    q1('SELECT COUNT(*) AS c FROM comments WHERE status="pending"'),
    q1('SELECT COUNT(*) AS c FROM events'),
    q1('SELECT COUNT(*) AS c FROM gallery_photos'),
    q1('SELECT COUNT(*) AS c FROM videos WHERE status="published"'),
  ]);

  const statusMap = {};
  articlesByStatus.forEach(r => { statusMap[r.status] = r.c; });

  res.render('admin/analytics', {
    title: 'Analytics | GTimes Admin',
    statusMap,
    totalViews: totalViews?.total || 0,
    topArticles,
    byCategory,
    subscribers:     subscribers?.c     || 0,
    pendingComments: pendingComments?.c  || 0,
    totalEvents:     totalEvents?.c      || 0,
    totalPhotos:     totalPhotos?.c      || 0,
    totalVideos:     totalVideos?.c      || 0,
  });
};
