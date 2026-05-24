// Create sidebar overlay once
const overlay = document.createElement('div');
overlay.className = 'gt-sidebar-overlay';
document.body.appendChild(overlay);

const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.querySelector('.gt-admin-sidebar');

function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.add('open');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
}
overlay.addEventListener('click', closeSidebar);

// Close sidebar on mobile when a nav link is clicked
if (sidebar) {
  sidebar.querySelectorAll('.gt-admin-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) closeSidebar();
    });
  });
}

// Mark active sidebar link
const path = window.location.pathname;
document.querySelectorAll('.gt-admin-link').forEach(link => {
  const href = link.getAttribute('href');
  if (href === '/' ? path === '/' : (href !== '/' && path.startsWith(href))) {
    link.classList.add('active');
  }
});

// Confirm deletes
document.querySelectorAll('[data-confirm]').forEach(el => {
  el.addEventListener('submit', e => {
    if (!confirm(el.dataset.confirm || 'Are you sure?')) e.preventDefault();
  });
});

// Image preview
document.querySelectorAll('input[type="file"][data-preview]').forEach(input => {
  input.addEventListener('change', () => {
    const previewId = input.dataset.preview;
    const preview = document.getElementById(previewId);
    if (!preview || !input.files[0]) return;
    preview.src = URL.createObjectURL(input.files[0]);
    preview.style.display = 'block';
  });
});
