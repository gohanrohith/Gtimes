// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navMenu   = document.getElementById('navMenu');
if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
  // Close nav when a link inside is clicked
  navMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth < 768) navMenu.classList.remove('open');
    });
  });
}

// Touch-friendly dropdowns (hover doesn't work on touch devices)
document.querySelectorAll('.gt-has-dropdown').forEach(item => {
  const link = item.querySelector('.gt-nav-link');
  if (!link) return;
  link.addEventListener('click', e => {
    if (window.innerWidth < 768) {
      e.preventDefault();
      item.classList.toggle('open');
    }
  });
});

// Lightbox for gallery (album page)
const lb     = document.getElementById('lightbox');
const lbImg  = document.getElementById('lbImg');
const lbCap  = document.getElementById('lbCaption');
const lbClose= document.getElementById('lbClose');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');

if (lb) {
  let lbData  = [];  // active set: [{src, caption}]
  let current = 0;
  const lbCounter = document.getElementById('lbCounter');

  function showPhoto() {
    const p = lbData[current];
    lbImg.src = p.src;
    lbCap.textContent = p.caption || '';
    if (lbCounter) lbCounter.textContent = lbData.length > 1 ? (current + 1) + ' / ' + lbData.length : '';
  }

  function openLbWith(data, idx) {
    lbData  = data;
    current = ((idx % data.length) + data.length) % data.length;
    showPhoto();
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLb() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Album page: .gt-photo-item elements
  const photoItems = Array.from(document.querySelectorAll('.gt-photo-item'));
  if (photoItems.length) {
    const data = photoItems.map(el => ({
      src:     el.dataset.src || el.querySelector('img')?.src || '',
      caption: el.dataset.caption || ''
    }));
    photoItems.forEach((el, i) => el.addEventListener('click', () => openLbWith(data, i)));
  }

  // Inline bento galleries in articles
  document.querySelectorAll('.gt-bento-gallery').forEach(function(gallery) {
    var data = [];
    try { data = JSON.parse(gallery.dataset.photos || '[]'); } catch(e) {}
    gallery.querySelectorAll('[data-lb-index]').forEach(function(tile) {
      tile.addEventListener('click', function() {
        openLbWith(data, parseInt(tile.dataset.lbIndex, 10));
      });
    });
  });

  lbClose.addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  lbPrev.addEventListener('click', e => {
    e.stopPropagation();
    current = (current - 1 + lbData.length) % lbData.length;
    showPhoto();
  });
  lbNext.addEventListener('click', e => {
    e.stopPropagation();
    current = (current + 1) % lbData.length;
    showPhoto();
  });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft')  lbPrev.click();
    if (e.key === 'ArrowRight') lbNext.click();
  });
} else {
  // Fallback lightbox for pages without the #lightbox element
  document.querySelectorAll('.gt-photo-item').forEach(item => {
    item.addEventListener('click', () => {
      const src = item.dataset.src || item.querySelector('img')?.src;
      if (!src) return;
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
      const img = document.createElement('img');
      img.src = src;
      img.style.cssText = 'max-width:90vw;max-height:88vh;object-fit:contain;border-radius:6px';
      overlay.appendChild(img);
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    });
  });
}

// Disable right-click "Save Image As" on all images
document.addEventListener('contextmenu', function(e) {
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
    return false;
  }
});

// Video player — replace thumbnail with embedded iframe on play
document.querySelectorAll('.gt-video-card').forEach(card => {
  const btn    = card.querySelector('.gt-play-btn');
  const thumb  = card.querySelector('.gt-video-thumb');
  const embed  = card.querySelector('.gt-video-embed');
  if (!btn || !embed) return;
  btn.addEventListener('click', () => {
    thumb.style.display = 'none';
    embed.style.display = 'block';
  });
});
