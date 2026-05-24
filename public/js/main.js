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
  const photos = Array.from(document.querySelectorAll('.gt-photo-item'));
  let current = 0;

  function openLb(idx) {
    current = idx;
    const item = photos[idx];
    lbImg.src = item.dataset.src || item.querySelector('img')?.src || '';
    lbCap.textContent = item.dataset.caption || '';
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLb() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }

  photos.forEach((item, idx) => item.addEventListener('click', () => openLb(idx)));
  lbClose.addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  lbPrev.addEventListener('click', e => { e.stopPropagation(); openLb((current - 1 + photos.length) % photos.length); });
  lbNext.addEventListener('click', e => { e.stopPropagation(); openLb((current + 1) % photos.length); });
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
