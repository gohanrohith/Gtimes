module.exports = function siteMiddleware(req, res, next) {
  const mainDomain = process.env.MAIN_DOMAIN || 'lvh.me';
  const hostname   = req.hostname;

  req.site = hostname === `admin.${mainDomain}` ? 'admin' : 'main';

  res.locals.site          = req.site;
  res.locals.currentYear   = new Date().getFullYear();
  res.locals.newsletterMsg = req.query.newsletter || null;
  res.locals.adminId       = req.session?.adminId || null;
  res.locals.adminRole     = req.session?.adminRole || null;
  res.locals.adminName     = req.session?.adminName || null;

  next();
};
