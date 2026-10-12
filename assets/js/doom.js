// DooM dataset explorer: browse the 15 contributing labs, or one behavior across labs.
// Data: assets/data/doom-labs.json (per-lab metadata summaries and lab-written definitions; pseudonyms only).

(function () {
  const root = document.getElementById('doom');
  if (!root) return;

  const CATEGORY = {
    investigative: ['sniff', 'sniffgenital', 'sniffbody', 'sniffface', 'reciprocalsniff'],
    aggressive: ['attack', 'chase', 'follow', 'dominance', 'dominancegroom', 'tussle', 'chaseattack'],
    appetitive: ['approach', 'allogroom', 'shepherd'],
    reproductive: ['mount', 'intromit', 'attemptmount'],
    defensive: ['escape', 'defend', 'avoid', 'submit', 'flinch'],
    nonsocial: ['rear', 'selfgroom', 'dig', 'climb', 'rest', 'huddle', 'freeze', 'run'],
    object: ['exploreobject', 'biteobject'],
  };
  const ORDER = Object.values(CATEGORY).flat();
  const catOf = {};
  for (const [c, list] of Object.entries(CATEGORY)) for (const a of list) catOf[a] = c;
  const NAMES = {
    sniffgenital: 'sniff genital', sniffbody: 'sniff body', sniffface: 'sniff face', reciprocalsniff: 'reciprocal sniff',
    dominancegroom: 'dominance groom', chaseattack: 'chase-attack', attemptmount: 'attempted mount', intromit: 'intromission',
    selfgroom: 'self-groom', exploreobject: 'explore object', biteobject: 'bite object',
  };
  const name = a => NAMES[a] || a;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, unit = '') => Array.isArray(v) ? `${v[0]}–${v[1]}${unit}` : `${v}${unit}`;
  const list = a => a.length ? a.join(', ') : '—';

  fetch(root.dataset.src).then(r => r.json()).then(({ labs }) => {
    const labIds = Object.keys(labs);
    // keep to the 33 behaviors used in the paper (drops e.g. a lab's "ejaculate" annotations)
    for (const id of labIds) labs[id].behaviors = labs[id].behaviors.filter(b => ORDER.includes(b));
    const behaviorLabs = {};
    for (const id of labIds) for (const b of labs[id].behaviors) (behaviorLabs[b] = behaviorLabs[b] || []).push(id);
    const behaviors = Object.keys(behaviorLabs).sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));

    const tabs = root.querySelectorAll('.doom-tab');
    const nav = root.querySelector('.doom-nav');
    const panel = root.querySelector('.doom-panel');
    let mode = 'labs', current = { labs: labIds[0], behaviors: 'attack' };

    // one definition: short ones in full, long ones collapsed after two lines of the lab's text
    function definition(lab, b) {
      const d = labs[lab].definitions[b];
      if (!d) return `<p class="doom-none">No written definition provided yet.</p>`;
      const items = d.text.map(t => `<li>${esc(t)}</li>`).join('');
      if (d.text.length <= 2 && d.text.join(' ').length < 320) return `<ul class="doom-def">${items}</ul>`;
      const rest = d.text.slice(1);
      return `<ul class="doom-def"><li>${esc(d.text[0])}</li></ul><details class="doom-more"><summary>Show the full definition (${rest.length} more rule${rest.length > 1 ? 's' : ''})</summary><ul class="doom-def">${rest.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details>`;
    }
    const chip = b => `<span class="doom-chip" style="--c: var(--c-${catOf[b] || 'object'})">${esc(name(b))}</span>`;

    function drawNav() {
      const items = mode === 'labs'
        ? labIds.map(id => `<button type="button" data-id="${id}" aria-pressed="${id === current.labs}">${id}<small>${labs[id].videos} videos</small></button>`)
        : behaviors.map(b => `<button type="button" data-id="${b}" aria-pressed="${b === current.behaviors}" style="--c: var(--c-${catOf[b] || 'object'})"><i></i>${esc(name(b))}<small>${behaviorLabs[b].length} lab${behaviorLabs[b].length > 1 ? 's' : ''}</small></button>`);
      nav.innerHTML = items.join('');
      nav.setAttribute('aria-label', mode === 'labs' ? 'Labs' : 'Behaviors');
    }

    function drawLab(id) {
      const l = labs[id];
      const stats = [
        ['Videos', `${l.videos} (${fmt(l.minutes, ' min')} each)`],
        ['Frame rate', fmt(l.fps, ' fps')],
        ['Resolution', fmt(l.pixPerCm, ' px/cm')],
        ['Arena', `${list(l.arenaShape)}, ${list(l.arenaCm.map(a => a + ' cm'))}`],
        ['Setup', list(l.arenaType)],
        ['Mice per video', fmt(l.mice)],
        ['Strains', list(l.strains)],
        ['Sex', list(l.sexes)],
        ['Pose tracking', `${list(l.tracking)}, ${fmt(l.keypoints)} keypoints`],
        ['Annotated bouts', l.bouts.toLocaleString()],
      ];
      if (l.conditions.length) stats.splice(8, 0, ['Conditions', list(l.conditions)]);
      const defined = l.behaviors.filter(b => l.definitions[b]).length;
      panel.innerHTML = `
        <div class="doom-lab">
          <figure class="doom-frame"><img src="assets/labs/${id}.jpg" alt="Sample frame with pose keypoints from ${id}."></figure>
          <div>
            <h3>${id}</h3>
            <dl class="doom-stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          </div>
        </div>
        <h4 class="doom-sub">Annotated behaviors <span>${l.behaviors.length} behaviors, ${defined} with a written definition</span></h4>
        <div class="doom-rows">${[...l.behaviors].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99))
          .map(b => `<div class="doom-row">${chip(b)}<div>${definition(id, b)}</div></div>`).join('')}</div>`;
    }

    function drawBehavior(b) {
      const ids = behaviorLabs[b];
      const defined = ids.filter(id => labs[id].definitions[b]).length;
      panel.innerHTML = `
        <h3 class="doom-bh">${chip(b)} <span>${ids.length} lab${ids.length > 1 ? 's' : ''} annotated this behavior, ${defined} with a written definition</span></h3>
        <div class="doom-cards">${ids.sort((x, y) => !!labs[y].definitions[b] - !!labs[x].definitions[b]).map(id => `
          <article class="doom-card">
            <header><span class="doom-thumb"><img src="assets/labs/${id}.jpg" alt=""></span><div><b>${id}</b><small>${list(labs[id].arenaType)} · ${fmt(labs[id].fps, ' fps')}</small></div></header>
            ${definition(id, b)}
          </article>`).join('')}</div>`;
    }

    function draw() {
      drawNav();
      mode === 'labs' ? drawLab(current.labs) : drawBehavior(current.behaviors);
    }

    tabs.forEach(t => t.addEventListener('click', () => {
      mode = t.dataset.mode;
      tabs.forEach(x => x.setAttribute('aria-selected', x === t));
      draw();
    }));
    nav.addEventListener('click', ev => {
      const btn = ev.target.closest('button[data-id]');
      if (!btn) return;
      current[mode] = btn.dataset.id;
      draw();
      if (matchMedia('(max-width: 760px)').matches) panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    draw();
  }).catch(() => { root.hidden = true; });
})();
