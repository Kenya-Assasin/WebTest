const form = document.getElementById('creatureForm');
const toast = document.getElementById('toast');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  toast.classList.add('show');
  form.reset();
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
});