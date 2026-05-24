// Mobile sidebar toggle
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.querySelector('.gt-admin-sidebar');
if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
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
