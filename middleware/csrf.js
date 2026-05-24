const crypto = require('crypto');

exports.csrfMiddleware = (req, res, next) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

exports.csrfProtect = (req, res, next) => {
  if (req.method !== 'POST') return next();
  const token = req.body._csrf || req.query._csrf || req.headers['x-csrf-token'];
  if (token && req.session.csrfToken && token === req.session.csrfToken) return next();
  res.status(403).send('Invalid security token. Please go back and try again.');
};
