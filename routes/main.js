const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/mainController');
const { formLimiter } = require('../middleware/rateLimiter');
const { csrfProtect } = require('../middleware/csrf');

router.get('/',                  ctrl.home);
router.get('/articles',          ctrl.articles);
router.get('/article/:slug',     ctrl.article);
router.post('/article/:slug/comment', formLimiter, csrfProtect, ctrl.postComment);
router.get('/category/:slug',    ctrl.category);
router.get('/tag/:slug',         ctrl.tag);
router.get('/author/:username',  ctrl.author);
router.get('/events',            ctrl.events);
router.get('/gallery',           ctrl.gallery);
router.get('/gallery/:slug',     ctrl.album);
router.get('/videos',            ctrl.videos);
router.get('/about',             ctrl.about);
router.get('/search',            ctrl.search);
router.post('/newsletter/subscribe', formLimiter, csrfProtect, ctrl.newsletterSubscribe);
router.get('/newsletter/unsubscribe', ctrl.newsletterUnsubscribe);
router.get('/rss.xml',           ctrl.rss);
router.get('/sitemap.xml',       ctrl.sitemap);
router.get('/robots.txt',        ctrl.robots);

module.exports = router;
