// Interactive version of Supp Fig 4: cosine similarity between HiDRA classifier heads.
// Data: assets/data/head-similarity.json, built from the published matrix; leaf order verified
// against the paper figure. heads = [shortLabel, lab, action], sim = millionths in heatmap order,
// tree = [lo, hi, height, left, right] per merge (child >= 0: merge index, child < 0: leaf -1-pos).

(function () {
  const root = document.getElementById('simmap');
  if (!root) return;

  const CATEGORY = {
    investigative: ['sniff', 'sniffall', 'sniffgenital', 'sniffbody', 'sniffface', 'reciprocalsniff'],
    aggressive: ['attack', 'chase', 'follow', 'dominance', 'dominancegroom', 'tussle', 'chaseattack'],
    appetitive: ['approach', 'allogroom', 'shepherd'],
    reproductive: ['mount', 'intromit', 'attemptmount'],
    defensive: ['escape', 'defend', 'avoid', 'submit', 'flinch'],
    nonsocial: ['rear', 'selfgroom', 'dig', 'climb', 'rest', 'huddle', 'freeze', 'run'],
    object: ['exploreobject', 'biteobject'],
  };
  const catOf = {};
  for (const [c, list] of Object.entries(CATEGORY)) for (const a of list) catOf[a] = c;

  const NAMES = {
    sniffall: 'sniff (all subtypes)', sniffgenital: 'sniff genital', sniffbody: 'sniff body', sniffface: 'sniff face',
    reciprocalsniff: 'reciprocal sniff', dominancegroom: 'dominance groom', chaseattack: 'chase-attack',
    attemptmount: 'attempted mount', selfgroom: 'self-groom', exploreobject: 'explore object', biteobject: 'bite object',
  };
  const behavior = a => NAMES[a] || a;

  // matplotlib magma, sampled at 9 points
  const MAGMA = ['#000004', '#1c1044', '#4f127b', '#812581', '#b5367a', '#e55064', '#fb8761', '#fec287', '#fcfdbf']
    .map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const VMIN = -0.2, VMAX = 1;
  function magma(v) {
    const t = Math.min(1, Math.max(0, (v - VMIN) / (VMAX - VMIN))) * (MAGMA.length - 1);
    const i = Math.min(MAGMA.length - 2, Math.floor(t)), f = t - i;
    const c = MAGMA[i].map((x, k) => Math.round(x + (MAGMA[i + 1][k] - x) * f));
    return `rgb(${c})`;
  }
  root.querySelector('.simmap-bar').style.background =
    `linear-gradient(90deg, ${[0, .125, .25, .375, .5, .625, .75, .875, 1].map((p, i) => `rgb(${MAGMA[i]}) ${p * 100}%`).join(', ')})`;

  fetch(root.dataset.src).then(r => r.json()).then(draw).catch(() => {
    const img = document.createElement('img');
    img.src = 'assets/fig/head-similarity.png';
    img.alt = 'Cosine similarity matrix of all classifier head weights, ordered by hierarchical clustering.';
    root.appendChild(img);
  });

  function draw({ heads, sim, tree }) {
    const N = heads.length, C = 10;             // cell size in SVG units
    const DH = 120, TOP = DH + 6;                // dendrogram height, heatmap top
    const LW = 128, LH = 128;                    // label gutters (right, bottom)
    const W = N * C + 6 + LW, H = TOP + N * C + 6 + LH;
    const S = (i, j) => sim[i][j] / 1e6;
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs = {}, parent) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    };

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'simmap-svg', role: 'img',
      'aria-label': 'Interactive cosine similarity matrix of the 82 HiDRA classifier heads, with a clustering dendrogram.' });
    root.appendChild(svg);

    // ---- heatmap
    const heat = el('g', { transform: `translate(0 ${TOP})` }, svg);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
      el('rect', { x: j * C, y: i * C, width: C + 0.4, height: C + 0.4, fill: magma(S(i, j)) }, heat);
    const dim = el('path', { class: 'simmap-dim', 'fill-rule': 'evenodd', d: '' }, heat);
    const rowBand = el('rect', { class: 'simmap-band', x: 0, width: N * C, height: C, visibility: 'hidden' }, heat);
    const colBand = el('rect', { class: 'simmap-band', y: 0, height: N * C, width: C, visibility: 'hidden' }, heat);
    const cellBox = el('rect', { class: 'simmap-cell', width: C, height: C, visibility: 'hidden' }, heat);
    const blockBox = el('rect', { class: 'simmap-block', visibility: 'hidden' }, heat);
    const hit = el('rect', { x: 0, y: 0, width: N * C, height: N * C, fill: 'transparent' }, heat);

    // ---- labels (right: rows, bottom: columns)
    const rowLabels = [], colLabels = [];
    const lr = el('g', { transform: `translate(${N * C + 6} ${TOP})` }, svg);
    const lb = el('g', { transform: `translate(0 ${TOP + N * C + 6})` }, svg);
    heads.forEach(([label, , action], i) => {
      const style = `fill: var(--c-${catOf[action] || 'object'})`;
      const r = el('text', { x: 0, y: i * C + C / 2, class: 'simmap-label', style, 'data-i': i }, lr);
      r.textContent = label;
      const c = el('text', { transform: `translate(${i * C + C / 2} 0) rotate(-90)`, x: 0, y: 0, class: 'simmap-label end', style, 'data-i': i }, lb);
      c.textContent = label;
      rowLabels.push(r); colLabels.push(c);
    });

    // ---- dendrogram (heights scaled so the root sits at the top)
    const maxH = Math.max(...tree.map(t => t[2]));
    const yOf = h => DH - (h / maxH) * (DH - 4);
    const xy = new Array(tree.length);
    const child = ref => ref < 0 ? [(-1 - ref) * C + C / 2, DH] : xy[ref];
    const dendro = el('g', { class: 'simmap-tree' }, svg);
    const branches = [];
    tree.forEach(([lo, hi, h, a, b], k) => {
      const [xa, ya] = child(a), [xb, yb] = child(b), y = yOf(h);
      xy[k] = [(xa + xb) / 2, y];
      const d = `M${xa},${ya}V${y}H${xb}V${yb}`;
      const g = el('g', { 'data-k': k }, dendro);
      branches.push(el('path', { d, class: 'simmap-branch' }, g));
      el('path', { d, class: 'simmap-branch-hit' }, g);
    });
    // descendants of each merge, for highlighting a whole subtree
    const subtree = tree.map(() => []);
    tree.forEach(([, , , a, b], k) => { subtree[k] = [k, ...(a >= 0 ? subtree[a] : []), ...(b >= 0 ? subtree[b] : [])]; });

    // ---- tooltip
    const tip = document.createElement('div');
    tip.className = 'simmap-tip';
    tip.hidden = true;
    root.appendChild(tip);
    const name = i => `<b>${heads[i][0]}</b> <span>${heads[i][1]} &middot; ${behavior(heads[i][2])}</span>`;
    function place(ev) {
      const box = root.getBoundingClientRect();
      tip.hidden = false;
      let x = ev.clientX - box.left + root.scrollLeft + 16, y = ev.clientY - box.top + 16;
      if (x + tip.offsetWidth > box.width + root.scrollLeft - 8) x = ev.clientX - box.left + root.scrollLeft - tip.offsetWidth - 16;
      if (y + tip.offsetHeight > box.height - 8) y = ev.clientY - box.top - tip.offsetHeight - 16;
      tip.style.left = Math.max(8, x) + 'px';
      tip.style.top = Math.max(8, y) + 'px';
    }

    // ---- highlight state
    let marked = [];
    function clear() {
      tip.hidden = true;
      for (const e of [rowBand, colBand, cellBox, blockBox]) e.setAttribute('visibility', 'hidden');
      marked.forEach(e => e.classList.remove('on'));
      marked = [];
      svg.classList.remove('focus');
    }
    function mark(...els) { for (const e of els) { e.classList.add('on'); marked.push(e); } }
    function cross(i, j) {
      rowBand.setAttribute('y', i * C); rowBand.setAttribute('visibility', 'visible');
      colBand.setAttribute('x', j * C); colBand.setAttribute('visibility', 'visible');
      mark(rowLabels[i], colLabels[j]);
    }

    function showCell(i, j, ev) {
      clear();
      cross(i, j);
      cellBox.setAttribute('x', j * C); cellBox.setAttribute('y', i * C); cellBox.setAttribute('visibility', 'visible');
      tip.innerHTML = i === j
        ? `${name(i)}<div class="v">same head</div>`
        : `${name(i)}${name(j)}<div class="v">similarity <b>${S(i, j).toFixed(2)}</b></div>`;
      place(ev);
    }

    function showHead(i, ev) {
      clear();
      cross(i, i);
      const best = [...Array(N).keys()].filter(j => j !== i).sort((a, b) => S(i, b) - S(i, a)).slice(0, 3);
      tip.innerHTML = `${name(i)}<div class="v">Most similar heads</div>` +
        best.map(j => `<div class="row"><span>${heads[j][0]}</span><b>${S(i, j).toFixed(2)}</b></div>`).join('');
      place(ev);
    }

    function showCluster(k, ev) {
      clear();
      const [lo, hi] = tree[k];
      const x0 = lo * C, x1 = (hi + 1) * C, M = N * C;
      dim.setAttribute('d', `M0,0H${M}V${M}H0Z M${x0},${x0}H${x1}V${x1}H${x0}Z`);
      svg.classList.add('focus');
      for (const [k2, v] of [['x', x0], ['y', x0], ['width', x1 - x0], ['height', x1 - x0]]) blockBox.setAttribute(k2, v);
      blockBox.setAttribute('visibility', 'visible');
      subtree[k].forEach(s => mark(branches[s]));
      for (let i = lo; i <= hi; i++) mark(rowLabels[i], colLabels[i]);
      const idx = [...Array(hi - lo + 1).keys()].map(d => lo + d);
      let sum = 0, pairs = 0;
      for (const a of idx) for (const b of idx) if (a < b) { sum += S(a, b); pairs++; }
      const labs = new Set(idx.map(i => heads[i][1])).size;
      const behs = new Set(idx.map(i => heads[i][2])).size;
      const list = idx.slice(0, 10).map(i => heads[i][0]).join(', ') + (idx.length > 10 ? `, and ${idx.length - 10} more` : '');
      tip.innerHTML = `<b>${idx.length} heads</b> <span>${behs} behavior${behs > 1 ? 's' : ''} from ${labs} lab${labs > 1 ? 's' : ''}</span>` +
        `<div class="v">mean similarity within cluster <b>${(sum / pairs).toFixed(2)}</b></div><div class="list">${list}</div>`;
      place(ev);
    }

    // ---- events (pointer events cover mouse, pen and touch)
    const toSvg = ev => {
      const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY;
      return p.matrixTransform(svg.getScreenCTM().inverse());
    };
    hit.addEventListener('pointermove', ev => {
      const p = toSvg(ev);
      const j = Math.floor(p.x / C), i = Math.floor((p.y - TOP) / C);
      if (i >= 0 && j >= 0 && i < N && j < N) showCell(i, j, ev);
    });
    hit.addEventListener('pointerdown', ev => hit.dispatchEvent(new PointerEvent('pointermove', ev)));
    const leaving = sel => ev => { if (!(ev.relatedTarget && ev.relatedTarget.closest && ev.relatedTarget.closest(sel))) clear(); };
    for (const g of [lr, lb]) {
      g.addEventListener('pointerover', ev => { const t = ev.target.closest('text'); if (t) showHead(+t.dataset.i, ev); });
      g.addEventListener('pointermove', ev => { if (!tip.hidden) place(ev); });
      g.addEventListener('pointerout', leaving('.simmap-label'));
    }
    dendro.addEventListener('pointerover', ev => { const g = ev.target.closest('g[data-k]'); if (g) showCluster(+g.dataset.k, ev); });
    dendro.addEventListener('pointermove', ev => { if (!tip.hidden) place(ev); });
    dendro.addEventListener('pointerout', leaving('g[data-k]'));
    hit.addEventListener('pointerleave', clear);
    document.addEventListener('pointerdown', ev => { if (!root.contains(ev.target)) clear(); });
  }
})();
