// HiDRA project site

// ---------- copy buttons ----------
document.addEventListener('click', async e => {
  const btn = e.target.closest('.copy');
  if (!btn) return;
  const pre = btn.closest('pre');
  let text = pre.dataset.text;
  if (!text) {
    const clone = pre.cloneNode(true);
    clone.querySelector('.copy').remove();
    text = clone.textContent.trim();
  }
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = 'Copied';
  } catch {
    btn.textContent = 'Press Ctrl+C';
  }
  setTimeout(() => (btn.textContent = 'Copy'), 1600);
});

// ---------- code tabs ----------
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t === tab));
    document.querySelectorAll('[data-panel]').forEach(p => (p.hidden = p.dataset.panel !== tab.dataset.tab));
  });
});

// ---------- videos: show the placeholder card until the file exists ----------
document.querySelectorAll('figure.media').forEach(fig => {
  const video = fig.querySelector('video');
  const source = video.querySelector('source');
  const missing = () => fig.classList.add('missing');
  source.addEventListener('error', missing);
  video.addEventListener('error', missing);
  if (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) missing();
});

// ---------- figure lightbox ----------
const lightbox = document.getElementById('lightbox');
document.querySelectorAll('.fig-frame img').forEach(img => {
  img.parentElement.addEventListener('click', () => {
    const big = lightbox.querySelector('img');
    big.src = img.src;
    big.alt = img.alt;
    lightbox.showModal();
  });
});
lightbox.addEventListener('click', () => lightbox.close());

// ---------- active nav link ----------
const links = [...document.querySelectorAll('.nav-links a')];
const io = new IntersectionObserver(entries => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
links.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });

