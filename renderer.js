// renderer.js
const address = document.getElementById('address');
const goBtn = document.getElementById('go');
const backBtn = document.getElementById('back');
const forwardBtn = document.getElementById('forward');
const reloadBtn = document.getElementById('reload');
const status = document.getElementById('status');
const urlPreview = document.getElementById('url-preview');

const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');

minBtn.onclick = () => window.electronAPI.minimize();
maxBtn.onclick = () => window.electronAPI.maximize();
closeBtn.onclick = () => window.electronAPI.close();

async function navigateTo(input) {
  if (!input) return;
  status.textContent = 'Navigating…';
  await window.electronAPI.navigate(input);
}

goBtn.addEventListener('click', () => navigateTo(address.value));
address.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') navigateTo(address.value);
});

backBtn.addEventListener('click', () => window.electronAPI.goBack());
forwardBtn.addEventListener('click', () => window.electronAPI.goForward());
reloadBtn.addEventListener('click', () => window.electronAPI.reload());

window.electronAPI.onNavEvent((data) => {
  if (data.type === 'loading') {
    status.textContent = 'Loading…';
  } else if (data.type === 'loaded') {
    status.textContent = 'Done';
    address.value = data.url;
    urlPreview.textContent = data.url;
    backBtn.disabled = !data.canGoBack;
    forwardBtn.disabled = !data.canGoForward;
  }
});

// initial URL fill
(async () => {
  try {
    const url = await window.electronAPI.getUrl();
    address.value = url || '';
    urlPreview.textContent = url || '';
  } catch(e) { /* ignore */ }
})();

// Nice micro-interactions
[backBtn, forwardBtn, goBtn, reloadBtn].forEach(b => {
  b.addEventListener('mousedown', () => b.style.transform = 'translateY(1px)');
  b.addEventListener('mouseup', () => b.style.transform = '');
});
