const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/adminController');
const { requireAdmin, requireSuper } = require('../middleware/auth');
const { csrfProtect }  = require('../middleware/csrf');

router.get('/login',  ctrl.loginPage);
router.post('/login', csrfProtect, ctrl.loginSubmit);
router.get('/logout', ctrl.logout);

router.use(requireAdmin);

// CSRF on all authenticated POSTs
router.use((req, res, next) => {
  if (req.method === 'POST') return csrfProtect(req, res, next);
  next();
});

// Dashboard
router.get('/', ctrl.dashboard);

// Analytics
router.get('/analytics', ctrl.analytics);

// Categories (super + editor)
router.get('/categories',               ctrl.categoriesList);
router.get('/categories/new',           ctrl.categoryForm);
router.post('/categories/new',          ctrl.createCategory);
router.get('/categories/:id/edit',      ctrl.editCategoryForm);
router.post('/categories/:id/edit',     ctrl.updateCategory);
router.post('/categories/:id/delete',   ctrl.deleteCategory);

// Tags
router.get('/tags',             ctrl.tagsList);
router.post('/tags/:id/delete', ctrl.deleteTag);

// Articles
router.post('/articles/upload-image', ctrl.uploadArticleImage);
router.get('/articles/galleries',     ctrl.getGalleriesJson);
router.get('/articles',               ctrl.articlesList);
router.get('/articles/new',           ctrl.articleForm);
router.post('/articles/new',          ctrl.createArticle);
router.get('/articles/:id/preview',   ctrl.previewArticle);
router.get('/articles/:id/edit',      ctrl.editArticleForm);
router.post('/articles/:id/edit',     ctrl.updateArticle);
router.post('/articles/:id/submit-review', ctrl.submitForReview);
router.post('/articles/:id/publish',       ctrl.publishArticle);
router.post('/articles/:id/unpublish',     ctrl.unpublishArticle);
router.post('/articles/:id/delete',   ctrl.deleteArticle);

// Events
router.get('/events',             ctrl.eventsList);
router.get('/events/new',         ctrl.eventForm);
router.post('/events/new',        ctrl.createEvent);
router.get('/events/:id/edit',    ctrl.editEventForm);
router.post('/events/:id/edit',   ctrl.updateEvent);
router.post('/events/:id/delete', ctrl.deleteEvent);

// Gallery
router.get('/gallery',                       ctrl.galleryList);
router.get('/gallery/new',                   ctrl.albumForm);
router.post('/gallery/new',                  ctrl.createAlbum);
router.get('/gallery/:id/upload',            ctrl.albumUploadForm);
router.post('/gallery/:id/upload',           ctrl.uploadPhotos);
router.post('/gallery/:id/delete',           ctrl.deleteAlbum);
router.post('/gallery/:id/cover/:photoId',   ctrl.setAlbumCover);
router.post('/gallery/photo/:id/caption',    ctrl.updatePhotoCaption);
router.post('/gallery/photo/:id/delete',     ctrl.deletePhoto);

// Videos
router.get('/videos',             ctrl.videosList);
router.post('/videos/new',        ctrl.createVideo);
router.post('/videos/:id/delete', ctrl.deleteVideo);

// Comments
router.get('/comments',                  ctrl.commentsList);
router.post('/comments/:id/approve',     ctrl.approveComment);
router.post('/comments/:id/spam',        ctrl.spamComment);
router.post('/comments/:id/delete',      ctrl.deleteComment);

// Newsletter (super + editor)
router.get('/newsletter',                ctrl.newsletterList);
router.get('/newsletter/export.csv',     ctrl.exportSubscribers);
router.post('/newsletter/send',          ctrl.sendNewsletter);
router.post('/newsletter/:id/delete',    ctrl.deleteSubscriber);

// Users management (super only)
router.get('/users',             requireSuper, ctrl.usersList);
router.get('/users/new',         requireSuper, ctrl.userForm);
router.post('/users/new',        requireSuper, ctrl.createUser);
router.get('/users/:id/edit',    requireSuper, ctrl.editUserForm);
router.post('/users/:id/edit',   requireSuper, ctrl.updateUser);
router.post('/users/:id/delete', requireSuper, ctrl.deleteUser);

// Session keepalive (auto-logout heartbeat)
router.get('/keepalive', (req, res) => { req.session.touch(); res.sendStatus(204); });

// Debug: list files in uploads/articles so we can verify uploads land on disk
router.get('/debug-uploads', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '../public/uploads/articles');
  try {
    const files = fs.readdirSync(dir);
    res.json({ dir, count: files.length, files: files.slice(-20) });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// Settings
router.get('/settings',              ctrl.settings);
router.post('/settings',             ctrl.saveSettings);
router.post('/google-reviews/sync',  ctrl.syncGoogleReviews);

// Own profile (bio/avatar)
router.get('/profile',   ctrl.profileForm);
router.post('/profile',  ctrl.saveProfile);

module.exports = router;
