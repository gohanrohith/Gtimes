require('dotenv').config();
const express    = require('express');
const session    = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet     = require('helmet');
const compression = require('compression');
const morgan     = require('morgan');
const path       = require('path');

const siteMiddleware  = require('./middleware/site');
const { csrfMiddleware } = require('./middleware/csrf');
const mainRoutes  = require('./routes/main');
const adminRoutes = require('./routes/admin');
const apiRoutes   = require('./routes/api');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'gtimes-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

if (process.env.DB_PASS) {
  try {
    const pool = require('./config/database');
    sessionConfig.store = new MySQLStore({
      clearExpired: true,
      checkExpirationInterval: 900000,
      expiration: 86400000,
    }, pool);
  } catch { console.warn('Session store falling back to memory'); }
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
const base = process.env.NODE_ENV === 'production' ? `https://${DOMAIN}` : `http://localhost:${PORT}`;
app.listen(PORT, () => {
  console.log(`\n  GTimes running at:`);
  console.log(`  Main  →  ${base}`);
  console.log(`  Admin →  ${base}/admin\n`);
});
