module.exports = function siteMiddleware(req, res, next) {
  req.site = req.path.startsWith('/admin') ? 'admin' : 'main';

  res.locals.site          = req.site;
  res.locals.currentYear   = new Date().getFullYear();
  res.locals.newsletterMsg = req.query.newsletter || null;
  res.locals.adminId       = req.session?.adminId || null;
  res.locals.adminRole     = req.session?.adminRole || null;
  res.locals.adminName     = req.session?.adminName || null;

  // Always define success/error so views never throw ReferenceError
  res.locals.success = req.query.success || null;
  res.locals.error   = req.query.error   || null;

  next();
};
