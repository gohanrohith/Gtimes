require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet     = require('helmet');
const compression = require('compression');
const morgan     = require('morgan');
const path       = require('path');
const fs         = require('fs');
const UPLOADS_BASE = process.env.UPLOADS_DIR || path.join(__dirname, 'public/uploads');
['articles','events','gallery','avatars','videos'].forEach(d =>
  fs.mkdirSync(path.join(UPLOADS_BASE, d), { recursive: true })
);

const siteMiddleware  = require('./middleware/site');
const { csrfMiddleware } = require('./middleware/csrf');
const mainRoutes  = require('./routes/main');
const adminRoutes = require('./routes/admin');
const apiRoutes   = require('./routes/api');

const app = express();

// Trust Hostinger's reverse proxy — required for secure cookies + correct IPs
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_BASE));

const isProduction = process.env.NODE_ENV === 'production';

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'gtimes-dev-secret',
  resave: false,
  saveUninitialized: true,   // ensure session is created on first GET so CSRF token persists
  cookie: {
    secure: isProduction,    // HTTPS-only in production
    sameSite: 'lax',         // required for form submissions to include cookie
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

if (process.env.DB_PASS) {
  try {
    const pool = require('./config/database');
    const store = new MySQLStore({
      clearExpired: true,
      checkExpirationInterval: 900000,
      expiration: 86400000,
    }, pool);
    store.on('error', err => console.warn('Session store error:', err.message));
    sessionConfig.store = store;
    console.log('  Sessions → MySQL');
  } catch (e) {
    console.warn('  Sessions → memory (DB store failed:', e.message, ')');
  }
}

app.use(session(sessionConfig));
app.use(csrfMiddleware);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(siteMiddleware);

// API (webhook receiver from Greenwood, no CSRF needed)
app.use('/api', apiRoutes);

// Admin at /admin, public site at /
app.use('/admin', adminRoutes);
app.use('/', mainRoutes);

app.use((req, res) => res.status(404).render('404', { title: '404 | GTimes' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { title: '500 | GTimes' });
});

const PORT = process.env.PORT || 3001;
const DOMAIN = process.env.MAIN_DOMAIN || 'localhost';
const base = isProduction ? `https://${DOMAIN}` : `http://localhost:${PORT}`;
app.listen(PORT, () => {
  console.log(`\n  GTimes running at:`);
  console.log(`  Main  →  ${base}`);
  console.log(`  Admin →  ${base}/admin\n`);
});
