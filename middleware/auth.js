function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    res.locals.adminName = req.session.adminName;
    res.locals.adminRole = req.session.adminRole;
    return next();
  }
  res.redirect('/login');
}

// Only super admins can access this route
function requireSuper(req, res, next) {
  if (req.session && req.session.adminRole === 'super') return next();
  res.status(403).render('500', { title: 'Access Denied | GTimes' });
}

// Super or editor can access
function requireEditor(req, res, next) {
  if (req.session && ['super', 'editor'].includes(req.session.adminRole)) return next();
  res.status(403).render('500', { title: 'Access Denied | GTimes' });
}

module.exports = { requireAdmin, requireSuper, requireEditor };
