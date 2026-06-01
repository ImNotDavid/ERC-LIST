/* =========================================================
   ERC 2026 Rankings — app.js
   ========================================================= */

const STORAGE_KEY  = 'erc2026_ranking';
const TIER_PALETTE = ['#c00','#d05000','#997700','#007700','#0055bb','#7700aa','#006688','#555','#888','#444'];

// ── State ────────────────────────────────────────────────
let TEAMS = [];
let state = {
  mode: null,
  title: '',
  filterVideos: true,
  sortBy: 'default',
  tierOrder:  ['S','A','B','C','D'],
  tierColors: { S:'#c00', A:'#d05000', B:'#997700', C:'#007700', D:'#0055bb' },
  tiers:      { S:[], A:[], B:[], C:[], D:[], U:[] },
  tierNames:  { S:'S', A:'A', B:'B', C:'C', D:'D', U:'Unranked' },
  ranked: [],
};

// ── Persistence ───────────────────────────────────────────
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!s?.mode) return false;
    // Back-compat: older saves without tierOrder/tierColors
    if (!s.tierOrder)  s.tierOrder  = ['S','A','B','C','D'];
    if (!s.tierColors) s.tierColors = { S:'#c00', A:'#d05000', B:'#997700', C:'#007700', D:'#0055bb' };
    Object.assign(state, s);
    return true;
  } catch (e) { return false; }
}

// ── Boot ─────────────────────────────────────────────────
async function boot() {
  const r = await fetch('teams.json');
  TEAMS = await r.json();
  TEAMS.forEach((t, i) => t.id = i);
  if (loadState()) { showView('rank'); renderRank(); }
  else              { showView('home'); }
}

// ── View switching ────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.getElementById('header-mode-badge').textContent = '';
  const isRank = name === 'rank';
  document.querySelectorAll('.rank-only').forEach(el => { el.style.display = isRank ? '' : 'none'; });
}

// ── Home ──────────────────────────────────────────────────
let selectedMode = 'tier';
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMode = btn.dataset.mode;
  });
});
document.querySelector('.mode-btn[data-mode="tier"]').classList.add('selected');

document.getElementById('btn-start').addEventListener('click', () => {
  state.mode         = selectedMode;
  state.title        = document.getElementById('ranking-title').value.trim()
                       || (selectedMode === 'tier' ? 'My Tier List' : 'My Power Ranking');
  state.filterVideos = document.getElementById('filter-videos-home').checked;
  state.sortBy       = 'default';
  document.getElementById('sort-select').value = 'default';

  const allIds = TEAMS.map(t => t.id);
  if (state.mode === 'tier') {
    state.tierOrder  = ['S','A','B','C','D'];
    state.tierColors = { S:'#c00', A:'#d05000', B:'#997700', C:'#007700', D:'#0055bb' };
    state.tiers      = { S:[], A:[], B:[], C:[], D:[], U: allIds };
    state.tierNames  = { S:'S', A:'A', B:'B', C:'C', D:'D', U:'Unranked' };
  } else {
    state.ranked = [];
  }
  saveState();
  showView('rank');
  renderRank();
});

// ── Logo helper ───────────────────────────────────────────
function makeLogoEl(team) {
  function flagDiv() {
    const d = document.createElement('div');
    d.className = 'card-logo-flag';
    d.textContent = team.flag;
    return d;
  }
  if (!team.logo) return flagDiv();
  const img = document.createElement('img');
  img.className = 'card-logo';
  img.src = team.logo;
  img.alt = team.name;
  img.loading = 'lazy';
  img.onerror = () => img.replaceWith(flagDiv());
  return img;
}

// ── Team Card ─────────────────────────────────────────────
function renderCard(team) {
  const div = document.createElement('div');
  div.className = 'team-card'
    + (team.has_video ? '' : ' no-video')
    + (state.filterVideos && !team.has_video ? ' filtered' : '');
  div.dataset.id = team.id;
  div.draggable  = true;

  const info = document.createElement('div');
  info.className = 'card-info';
  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = team.name;
  const flag = document.createElement('div');
  flag.className = 'card-flag';
  flag.textContent = team.flag + ' ' + team.country;
  const uni = document.createElement('div');
  uni.className = 'card-uni';
  uni.title = team.university;
  uni.textContent = team.university;
  info.append(name, flag, uni);
  div.append(makeLogoEl(team), info);

  if (team.has_video) {
    const dot = document.createElement('div');
    dot.className = 'card-video-dot';
    dot.title = 'Has submission video';
    div.appendChild(dot);
  }

  div.addEventListener('click', () => { if (!draggingId) openPanel(team.id); });
  div.addEventListener('dragstart', onDragStart);
  div.addEventListener('dragend',   onDragEnd);
  return div;
}

// ── Sort helpers ──────────────────────────────────────────
function sortedIds(ids) {
  if (state.sortBy === 'default') return ids;
  const arr = [...ids];
  if (state.sortBy === 'alpha') {
    arr.sort((a, b) => TEAMS[a].name.localeCompare(TEAMS[b].name));
  } else if (state.sortBy === 'country') {
    arr.sort((a, b) => {
      const c = TEAMS[a].country.localeCompare(TEAMS[b].country);
      return c !== 0 ? c : TEAMS[a].name.localeCompare(TEAMS[b].name);
    });
  } else if (state.sortBy === 'best') {
    arr.sort((a, b) => {
      const fa = finishRank(TEAMS[a].best_finish), fb = finishRank(TEAMS[b].best_finish);
      return fa !== fb ? fa - fb : TEAMS[a].name.localeCompare(TEAMS[b].name);
    });
  }
  return arr;
}
function finishRank(f) {
  if (!f || f === '—') return 999;
  const m = f.match(/(\d+)/);
  return m ? parseInt(m[1]) : 999;
}

// ── Render Rank View ──────────────────────────────────────
function renderRank() {
  const container = document.getElementById('rank-content');
  container.innerHTML = '';

  document.getElementById('header-mode-badge').textContent =
    state.mode === 'tier' ? 'Tier List' : 'Power Ranking';
  const titleEl = document.getElementById('rank-title-display');
  if (titleEl) titleEl.textContent = state.title;

  const filterBtn = document.getElementById('btn-filter-videos');
  filterBtn.classList.toggle('btn-filter-active', state.filterVideos);
  filterBtn.textContent = state.filterVideos ? 'Show all' : '📹 Videos only';

  const sortSel = document.getElementById('sort-select');
  if (sortSel.value !== state.sortBy) sortSel.value = state.sortBy;

  if (state.mode === 'tier') renderTierList(container);
  else renderPowerRanking(container);

  document.getElementById('share-bar').classList.add('visible');
}

// ── Tier management ───────────────────────────────────────
function addTier() {
  const key   = 't' + Date.now();
  const color = TIER_PALETTE[state.tierOrder.length % TIER_PALETTE.length];
  state.tierOrder.push(key);
  state.tierColors[key] = color;
  state.tiers[key]      = [];
  state.tierNames[key]  = 'New';
  saveState();
  renderRank();
}

function removeTier(key) {
  // Return teams to unranked pool
  state.tiers.U = [...(state.tiers[key] || []), ...state.tiers.U];
  state.tierOrder = state.tierOrder.filter(k => k !== key);
  delete state.tiers[key];
  delete state.tierNames[key];
  delete state.tierColors[key];
  saveState();
  renderRank();
}

// ── Tier List Render ──────────────────────────────────────
function renderTierList(container) {
  const table = document.createElement('table');
  table.className = 'tier-list';
  const tbody = document.createElement('tbody');

  state.tierOrder.forEach(tier => {
    const tr = document.createElement('tr');
    tr.className = 'tier-row';
    tr.dataset.tier = tier;

    // Label cell
    const labelTd = document.createElement('td');
    labelTd.className = 'tier-label';
    labelTd.style.background = state.tierColors[tier] || '#777';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'tier-label-inner';
    labelSpan.contentEditable = 'true';
    labelSpan.textContent = state.tierNames[tier] || tier;
    labelSpan.title = 'Click to rename';
    labelSpan.addEventListener('input', () => {
      state.tierNames[tier] = labelSpan.textContent.trim() || tier;
      saveState();
    });
    labelSpan.addEventListener('mousedown', e => e.stopPropagation());

    const removeBtn = document.createElement('button');
    removeBtn.className = 'tier-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove tier';
    removeBtn.style.display = state.tierOrder.length > 1 ? '' : 'none';
    removeBtn.addEventListener('click', e => { e.stopPropagation(); removeTier(tier); });

    labelTd.append(labelSpan, removeBtn);

    // Cards cell
    const cardsTd = document.createElement('td');
    cardsTd.className = 'tier-cards';
    cardsTd.dataset.tier = tier;
    sortedIds(state.tiers[tier] || []).forEach(id => {
      if (TEAMS[id]) cardsTd.appendChild(renderCard(TEAMS[id]));
    });
    setupTierDropZone(cardsTd);

    tr.append(labelTd, cardsTd);
    tbody.appendChild(tr);
  });

  // Add tier row
  const addRow = document.createElement('tr');
  const addTd  = document.createElement('td');
  addTd.colSpan = 2;
  addTd.style.padding = '0';
  const addBtn = document.createElement('button');
  addBtn.className = 'tier-add-btn';
  addBtn.textContent = '+ Add tier';
  addBtn.addEventListener('click', addTier);
  addTd.appendChild(addBtn);
  addRow.appendChild(addTd);
  tbody.appendChild(addRow);

  table.appendChild(tbody);
  container.appendChild(table);

  // Unranked pool
  const poolWrap  = document.createElement('div');
  poolWrap.className = 'unranked-pool';
  const poolLabel = document.createElement('div');
  poolLabel.className = 'pool-label';
  poolLabel.textContent = 'Unranked — drag teams into tiers above';
  const poolCards = document.createElement('div');
  poolCards.className = 'pool-cards';
  poolCards.dataset.tier = 'U';
  sortedIds(state.tiers.U || []).forEach(id => {
    if (TEAMS[id]) poolCards.appendChild(renderCard(TEAMS[id]));
  });
  setupTierDropZone(poolCards);
  poolWrap.append(poolLabel, poolCards);
  container.appendChild(poolWrap);
}

// ── Power Ranking Render ──────────────────────────────────
function renderPowerRanking(container) {
  const layout = document.createElement('div');
  layout.className = 'pr-layout';

  const listWrap = document.createElement('div');
  listWrap.className = 'pr-list';
  listWrap.id = 'pr-list';
  state.ranked
    .filter(id => !state.filterVideos || TEAMS[id]?.has_video)
    .forEach((id, pos) => listWrap.appendChild(buildPrSlot(pos + 1, id)));

  const endSlot = document.createElement('div');
  endSlot.className = 'pr-slot empty';
  setupPrSlotDrop(endSlot, null);
  listWrap.appendChild(endSlot);

  const poolWrap  = document.createElement('div');
  poolWrap.className = 'pr-pool-wrap';
  const poolLabel = document.createElement('div');
  poolLabel.className = 'pr-pool-label';
  poolLabel.textContent = 'Pool';
  const pool = document.createElement('div');
  pool.className = 'pr-pool';
  pool.id = 'pr-pool';
  sortedIds(
    TEAMS.filter(t => !state.ranked.includes(t.id) && (!state.filterVideos || t.has_video)).map(t => t.id)
  ).forEach(id => pool.appendChild(renderCard(TEAMS[id])));
  setupPrPoolDrop(pool);

  poolWrap.append(poolLabel, pool);
  layout.append(listWrap, poolWrap);
  container.appendChild(layout);
}

function buildPrSlot(pos, id) {
  const slot = document.createElement('div');
  slot.className = 'pr-slot';
  slot.dataset.prPos = pos;
  const num = document.createElement('div');
  num.className = 'pr-num' + (pos <= 3 ? ' top3' : '');
  num.textContent = pos;
  if (TEAMS[id]) slot.appendChild(renderCard(TEAMS[id]));
  setupPrSlotDrop(slot, pos - 1);
  slot.insertBefore(num, slot.firstChild);
  return slot;
}

// ── Drag & Drop ───────────────────────────────────────────
let draggingId = null;

function onDragStart(e) {
  draggingId = parseInt(e.currentTarget.dataset.id);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggingId);
  setTimeout(() => e.currentTarget.classList.add('dragging'), 0);
}
function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  draggingId = null;
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function setupTierDropZone(el) {
  el.addEventListener('dragover',  e => { e.preventDefault(); el.classList.add('drag-over'); });
  el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over'); });
  el.addEventListener('drop', e => {
    e.preventDefault(); el.classList.remove('drag-over');
    const id = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(id)) return;
    removefromAllTiers(id); removeFromRanked(id);
    state.tiers[el.dataset.tier].push(id);
    saveState(); renderRank();
  });
}
function setupPrSlotDrop(slot, insertIndex) {
  slot.addEventListener('dragover',  e => { e.preventDefault(); slot.classList.add('drag-over'); });
  slot.addEventListener('dragleave', e => { if (!slot.contains(e.relatedTarget)) slot.classList.remove('drag-over'); });
  slot.addEventListener('drop', e => {
    e.preventDefault(); slot.classList.remove('drag-over');
    const id = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(id)) return;
    removeFromRanked(id); removefromAllTiers(id);
    state.ranked.splice(insertIndex !== null ? insertIndex : state.ranked.length, 0, id);
    saveState(); renderRank();
  });
}
function setupPrPoolDrop(pool) {
  pool.addEventListener('dragover',  e => { e.preventDefault(); pool.classList.add('drag-over'); });
  pool.addEventListener('dragleave', e => { if (!pool.contains(e.relatedTarget)) pool.classList.remove('drag-over'); });
  pool.addEventListener('drop', e => {
    e.preventDefault(); pool.classList.remove('drag-over');
    const id = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(id)) return;
    removeFromRanked(id); saveState(); renderRank();
  });
}

function removefromAllTiers(id) {
  Object.keys(state.tiers).forEach(t => { state.tiers[t] = state.tiers[t].filter(x => x !== id); });
}
function removeFromRanked(id) { state.ranked = state.ranked.filter(x => x !== id); }

// ── Touch drag polyfill ───────────────────────────────────
(function() {
  let clone = null;
  document.addEventListener('touchstart', e => {
    const card = e.target.closest('.team-card');
    if (!card) return;
    draggingId = parseInt(card.dataset.id);
    const t = e.touches[0];
    clone = card.cloneNode(true);
    clone.style.cssText = `position:fixed;pointer-events:none;opacity:.7;z-index:999;width:${card.offsetWidth}px;top:${card.getBoundingClientRect().top}px;left:${card.getBoundingClientRect().left}px;`;
    document.body.appendChild(clone);
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!clone) return;
    e.preventDefault();
    const t = e.touches[0];
    clone.style.top  = (t.clientY - 40) + 'px';
    clone.style.left = (t.clientX - 40) + 'px';
  }, { passive: false });
  document.addEventListener('touchend', e => {
    if (!clone || draggingId === null) return;
    const t = e.changedTouches[0];
    clone.remove(); clone = null;
    const underEl = document.elementFromPoint(t.clientX, t.clientY);
    if (!underEl) { draggingId = null; return; }
    const tierCards = underEl.closest('[data-tier]');
    if (tierCards) {
      removefromAllTiers(draggingId); removeFromRanked(draggingId);
      state.tiers[tierCards.dataset.tier].push(draggingId);
      saveState(); renderRank(); draggingId = null; return;
    }
    if (underEl.closest('#pr-pool')) {
      removeFromRanked(draggingId); saveState(); renderRank(); draggingId = null; return;
    }
    const slot = underEl.closest('.pr-slot');
    if (slot) {
      const pos = parseInt(slot.dataset.prPos);
      removeFromRanked(draggingId);
      state.ranked.splice(isNaN(pos) ? state.ranked.length : pos - 1, 0, draggingId);
      saveState(); renderRank();
    }
    draggingId = null;
  });
})();

// ── Video Panel ───────────────────────────────────────────
const panel   = document.getElementById('video-panel');
const overlay = document.getElementById('panel-overlay');

function openPanel(teamId) {
  const team = TEAMS[teamId];
  if (!team) return;
  document.getElementById('panel-logo').src = team.logo || 'logos/placeholder.svg';
  document.getElementById('panel-logo').onerror = () => { document.getElementById('panel-logo').src = 'logos/placeholder.svg'; };
  document.getElementById('panel-name').textContent  = team.name;
  document.getElementById('panel-name2').textContent = team.name;
  document.getElementById('panel-sub').textContent   = team.flag + ' ' + team.country;
  document.getElementById('panel-university').textContent = team.university || '—';
  document.getElementById('panel-country').textContent    = team.country    || '—';
  document.getElementById('panel-best').textContent       = team.best_finish|| '—';
  const embedWrap = document.getElementById('panel-embed');
  const noVideo   = document.getElementById('panel-no-video');
  if (team.has_video && team.video_id) {
    embedWrap.style.display = ''; noVideo.style.display = 'none';
    embedWrap.innerHTML = `<iframe class="video-embed" src="https://www.youtube.com/embed/${team.video_id}?autoplay=0" allowfullscreen loading="lazy"></iframe>`;
  } else {
    embedWrap.style.display = 'none'; noVideo.style.display = '';
  }
  const ercLink = document.getElementById('panel-erc-link');
  ercLink.href = team.erc_page || '#';
  ercLink.style.display = team.erc_page ? '' : 'none';
  panel.classList.add('open');
  overlay.classList.add('active');
}
function closePanel() {
  panel.classList.remove('open');
  overlay.classList.remove('active');
  document.getElementById('panel-embed').innerHTML = '';
}
document.getElementById('btn-panel-close').addEventListener('click', closePanel);
overlay.addEventListener('click', closePanel);

// ── Filter / Sort ─────────────────────────────────────────
document.getElementById('btn-filter-videos').addEventListener('click', () => {
  state.filterVideos = !state.filterVideos; saveState(); renderRank();
});
document.getElementById('sort-select').addEventListener('change', e => {
  state.sortBy = e.target.value; saveState(); renderRank();
});

// ── New Ranking ───────────────────────────────────────────
document.getElementById('btn-new-ranking').addEventListener('click', () => {
  closePanel();
  localStorage.removeItem(STORAGE_KEY);
  state.mode = null;
  showView('home');
});

// ── PNG Export ────────────────────────────────────────────
document.getElementById('btn-export-png').addEventListener('click', exportPng);

async function exportPng() {
  closePanel();
  showToast('Generating PNG…');
  const el = document.getElementById('rank-content');

  // Replace every card-logo <img> with a square canvas (object-fit:cover)
  // html2canvas doesn't honour object-fit, so we bake the crop ourselves
  const logoImgs = Array.from(el.querySelectorAll('img.card-logo'));
  logoImgs.forEach(img => {
    const size = img.offsetWidth || 50;
    const cvs  = document.createElement('canvas');
    cvs.width = cvs.height = size;
    cvs.style.cssText = img.style.cssText;
    cvs.className = img.className;
    const ctx = cvs.getContext('2d');
    const nw = img.naturalWidth  || size;
    const nh = img.naturalHeight || size;
    const scale = Math.max(size / nw, size / nh);
    const dw = nw * scale, dh = nh * scale;
    ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
    img.replaceWith(cvs);
  });

  // Hide unranked pool and UI controls for export
  const pool    = el.querySelector('.unranked-pool');
  const addBtn  = el.querySelector('.tier-add-btn');
  if (pool)   pool.style.display = 'none';
  if (addBtn) addBtn.style.display = 'none';

  const hdr = document.createElement('div');
  hdr.style.cssText = 'padding:6px 10px;font-weight:bold;font-size:14px;border-bottom:1px solid #bbb;background:#f5f5f5;font-family:Arial,sans-serif;';
  hdr.textContent = state.title || 'ERC 2026 Rankings';
  el.insertBefore(hdr, el.firstChild);

  const ftr = document.createElement('div');
  ftr.style.cssText = 'padding:5px 10px;font-size:11px;color:#777;text-align:center;border-top:1px solid #eee;font-family:Arial,sans-serif;';
  ftr.textContent = 'make your own at erc.icrobotics.co.uk';
  el.appendChild(ftr);

  try {
    const canvas = await html2canvas(el, {
      backgroundColor: '#fff', useCORS: true, allowTaint: true,
      scale: 2, scrollX: 0, scrollY: 0,
      height: el.scrollHeight, windowWidth: el.scrollWidth, windowHeight: el.scrollHeight,
    });
    hdr.remove(); ftr.remove();
    if (pool)   pool.style.display = '';
    if (addBtn) addBtn.style.display = '';
    renderRank();
    const a = document.createElement('a');
    a.download = (state.title || 'ERC2026').replace(/[^\w\- ]/g, '_') + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    showToast('PNG saved!');
  } catch (err) {
    hdr.remove(); ftr.remove();
    if (pool)   pool.style.display = '';
    if (addBtn) addBtn.style.display = '';
    renderRank();
    showToast('Export failed'); console.error(err);
  }
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

boot();
