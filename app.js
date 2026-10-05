/* Annas Wunschliste – PWA. Daten liegen in IndexedDB auf dem Gerät. */
(() => {
'use strict';

/* ---------- Basics ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const pad = n => String(n).padStart(2, '0');
const ymd = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);
const TODAY = () => { const d = new Date(); return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate()); };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round2 = n => Math.round(n * 100) / 100;
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const str = v => (typeof v === 'string' ? v.trim() : '');
const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
const numOrNull = v => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : null);
const validDate = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

function parseNum(s) {
  if (s == null) return null;
  let t = String(s).replace(/[\s€]/g, '');
  if (!t) return null;
  t = t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(t);
  return isFinite(n) ? round2(n) : null;
}
const numInput = n => (n == null || n === '' ? '' : String(n).replace('.', ','));
function eur(n) {
  const r = round2(n || 0);
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(r) ? 0 : 2, maximumFractionDigits: 2 }).format(r);
}
const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
function fmtDate(d) { if (!d) return ''; const [y, m, dd] = d.split('-'); return dd + '.' + m + '.' + y; }
function fmtMonth(d) { const [y, m] = d.split('-').map(Number); return new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric' }).format(new Date(y, m - 1, 1)); }
function fmtLong(d) { const [y, m, dd] = d.split('-').map(Number); return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, dd)); }
const possessive = n => (/[sßxz]$/i.test(n) ? n + '’' : n + 's');
function safeUrl(u) {
  u = str(u); if (!u) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
  try { const x = new URL(u); return (x.protocol === 'http:' || x.protocol === 'https:') && x.hostname.includes('.') ? x.href : ''; } catch (e) { return ''; }
}
function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }

const ICONS = {
  plus: '<path d="M8 3v10M3 8h10"/>',
  share: '<path d="M8 2.5v8M5 5.5l3-3 3 3M3 9.5v4h10v-4"/>',
  note: '<path d="M4 2h5.5L13 5.5V14H4z"/><path d="M9.5 2v3.5H13M6.5 9h4M6.5 11.5h4"/>',
  sliders: '<path d="M2.5 5h11M2.5 11h11"/><circle cx="6" cy="5" r="1.7" fill="var(--surface)"/><circle cx="10.5" cy="11" r="1.7" fill="var(--surface)"/>',
  gift: '<rect x="2.5" y="6" width="11" height="3" rx=".5"/><path d="M3.5 9v5h9V9M8 6v8M8 6C7 3 4.2 2.8 4.5 4.6 4.8 6 8 6 8 6zm0 0c1-3 3.8-3.2 3.5-1.4C11.2 6 8 6 8 6z"/>',
  pencil: '<path d="M10.8 2.7l2.5 2.5L6 12.5l-3.2.7.7-3.2z"/>',
  coin: '<circle cx="8" cy="8" r="5.8"/><path d="M10.2 5.8a2.6 2.6 0 100 4.4M5.3 7.3h3.4M5.3 8.8h3.4"/>',
  check: '<path d="M3 8.5l3.2 3.2L13 4.8"/>',
  trash: '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9"/>',
  ext: '<path d="M9.5 2.5h4v4M13.5 2.5L8 8M11.5 9.5v4h-9v-9h4"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.2"/><path d="M3 10.5V3.2c0-.4.3-.7.7-.7h6.8"/>',
  download: '<path d="M8 2.5v8M5 7.5l3 3 3-3M3 13.5h10"/>',
  upload: '<path d="M8 10.5v-8M5 5.5l3-3 3 3M3 13.5h10"/>',
  eye: '<path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>',
  undo: '<path d="M4.5 6h5.5a3 3 0 010 6H6.5M4.5 6L7 3.5M4.5 6L7 8.5"/>',
  x: '<path d="M4 4l8 8M12 4l-8 8"/>'
};
const ic = n => '<svg class="i" viewBox="0 0 16 16" aria-hidden="true">' + ICONS[n] + '</svg>';

/* ---------- State ---------- */
const THEMES = [{ id: '', name: 'Wie das Gerät' }, { id: 'light', name: 'Hell' }, { id: 'dark', name: 'Dunkel' }];
let themeMem = null;
const getTheme = () => { if (themeMem !== null) return themeMem; const t = ls.get('wl-theme'); return t === 'light' || t === 'dark' ? t : ''; };
const setTheme = v => { themeMem = v === 'light' || v === 'dark' ? v : ''; ls.set('wl-theme', themeMem); };
const applyTheme = t => { try { if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; } catch (e) {} };
applyTheme(getTheme());
let state = normalize(null);

function normalize(s) {
  s = s && typeof s === 'object' ? s : {};
  return {
    v: 1,
    owner: str(s.owner) || 'Anna',
    budget: Math.max(0, num(s.budget, 0)),
    mood: clamp(num(s.mood, 50), 0, 100),
    updated: validDate(s.updated) || TODAY(),
    wishes: Array.isArray(s.wishes) ? s.wishes.map(normWish).filter(Boolean) : []
  };
}
function normWish(w) {
  if (!w || typeof w !== 'object') return null;
  const a = w.anchor && validDate(w.anchor.date) ? { date: w.anchor.date, amount: Math.max(0, num(w.anchor.amount, 0)) } : null;
  const d = w.done && typeof w.done === 'object' ? { how: w.done.how === 'geschenkt' ? 'geschenkt' : 'gekauft', date: validDate(w.done.date) || TODAY(), from: str(w.done.from) } : null;
  return {
    id: str(w.id) || uid(),
    name: str(w.name) || 'Ohne Namen',
    category: str(w.category), variant: str(w.variant), note: str(w.note),
    image: typeof w.image === 'string' && w.image.startsWith('data:image/') ? w.image : '',
    shops: Array.isArray(w.shops) ? w.shops.map(x => ({ label: str(x && x.label), url: safeUrl(x && x.url), price: numOrNull(x && x.price) })).filter(x => x.url || x.label) : [],
    price: numOrNull(w.price),
    want: clamp(Math.round(num(w.want, 5)), 1, 10),
    need: clamp(Math.round(num(w.need, 5)), 1, 10),
    gift: !!w.gift,
    rate: Math.max(0, round2(num(w.rate, 0))),
    start: validDate(w.start) || TODAY(),
    anchor: a,
    deposits: Array.isArray(w.deposits) ? w.deposits.filter(x => x && validDate(x.date) && typeof x.amount === 'number').map(x => ({ id: str(x.id) || uid(), date: x.date, amount: round2(x.amount), note: str(x.note) })) : [],
    done: d,
    created: validDate(w.created) || TODAY(),
    example: !!w.example
  };
}

/* ---------- Money logic ---------- */
function priceOf(w) {
  const ps = w.shops.map(s => s.price).filter(p => p != null && p > 0);
  return ps.length ? Math.min(...ps) : (w.price || 0);
}
function monthDate(start, m) {
  const [y, mo, d] = start.split('-').map(Number);
  const t = new Date(y, mo - 1 + m, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return ymd(t.getFullYear(), t.getMonth() + 1, Math.min(d, last));
}
function countInstallments(start, rate, afterExcl, untilIncl) {
  if (!rate) return 0;
  let c = 0;
  for (let m = 0; m < 1200; m++) {
    const d = monthDate(start, m);
    if (d > untilIncl) break;
    if (afterExcl && d <= afterExcl) continue;
    c++;
  }
  return c;
}
function baseOf(w, today) {
  const after = w.anchor ? w.anchor.date : null;
  let s = w.anchor ? w.anchor.amount : 0;
  for (const dp of w.deposits) if ((!after || dp.date > after) && dp.date <= today) s += dp.amount;
  return s;
}
function saved(w) {
  const today = TODAY();
  const after = w.anchor ? w.anchor.date : null;
  return Math.max(0, round2(baseOf(w, today) + w.rate * countInstallments(w.start, w.rate, after, today)));
}
function eta(w) {
  const p = priceOf(w); if (!p) return { noPrice: true };
  const s = saved(w);
  if (s >= p) return { reached: true };
  if (!w.rate) return { noRate: true };
  const need = Math.ceil((p - s) / w.rate - 1e-9);
  const today = TODAY();
  let c = 0;
  for (let m = 0; m < 1200; m++) {
    const d = monthDate(w.start, m);
    if (d <= today) continue;
    if (++c >= need) return { date: d, months: need };
  }
  return { far: true };
}
const wantWeight = () => 1 - state.mood / 100;
const score = w => w.want * wantWeight() + w.need * (1 - wantWeight());
const openWishes = () => state.wishes.filter(w => !w.done);
const byPrio = (a, b) => score(b) - score(a) || b.want - a.want || priceOf(a) - priceOf(b);

function totals() {
  const open = openWishes();
  let total = 0, gift = 0, mine = 0, sav = 0, rest = 0, rates = 0, noPlan = 0, last = null;
  for (const w of open) {
    const p = priceOf(w), s = Math.min(saved(w), p || saved(w));
    total += p; if (w.gift) gift += p; else mine += p;
    sav += s;
    const e = eta(w);
    if (w.rate && !e.reached) { rates += w.rate; rest += Math.max(0, p - s); }
    if (e.date && (!last || e.date > last)) last = e.date;
    if (!w.rate && !e.reached && !w.gift) noPlan++;
  }
  return { n: open.length, total, gift, mine, sav, rest, rates, noPlan, last };
}

/* ---------- UI state ---------- */
const UI_DEF = { tab: 'list', filter: 'all', cat: '', sort: 'prio' };
let ui = Object.assign({}, UI_DEF, (() => { try { return JSON.parse(ls.get('wl-ui') || '{}'); } catch (e) { return {}; } })());
const saveUi = () => ls.set('wl-ui', JSON.stringify(ui));
/* Besitzerin ist man immer, außer die URL trägt einen Teilen-Link (#g=…). */
const SHARE_PREFIX = '#g=';
const isShared = () => location.hash.startsWith(SHARE_PREFIX);
let mode = isShared() ? 'viewer' : 'owner';
let preview = false;
let viewData = null;       // Daten der Ansicht für andere (aus Link oder Vorschau)
let viewError = '';
let statusKey = 'saved';
let pendingDelete = null;
let lastBackup = '';
let updateReg = null;

/* ---------- Rendering ---------- */
function render() {
  const fid = document.activeElement && document.activeElement.id;
  const app = $('#app');
  app.innerHTML = (mode === 'owner' && !preview) ? renderOwner() : renderViewer();
  const ttl = mode === 'viewer' || preview ? (viewData ? viewData.o : state.owner) : state.owner;
  document.title = possessive(ttl) + ' Wunschliste';
  if (!$('#dlg').open) applyTheme(getTheme());
  if (fid) { const el = document.getElementById(fid); if (el && !$('#dlg').open) try { el.focus({ preventScroll: true }); } catch (e) {} }
}

const runhead = (nav, owner = state.owner, upd = state.updated) => `<header class="runhead"><div class="wrap cap"><span>Wunschliste · ${esc(owner)}</span>${nav}<span>Stand ${fmtDate(upd)}</span></div></header>`;
const hero = (sub, extra = '', lede = '', owner = state.owner) => `<section class="hero"><h1>${esc(possessive(owner))} Wunschliste</h1><div class="subtitle cap">${sub.map(esc).join('<span class="sep">·</span>')}</div>${lede ? `<p class="lede">${lede}</p>` : ''}</section>${extra}<hr class="rule-heavy">`;
const sec = (no, id, title, inner) => `<section class="section" id="${id}" aria-labelledby="h-${id}"><h2 class="label" id="h-${id}"><span class="no">№ ${pad(no)}</span> — ${esc(title)}</h2>${inner}</section>`;

function renderOwner() {
  const open = openWishes(), done = state.wishes.filter(w => w.done);
  const hasEx = state.wishes.some(w => w.example);
  const nav = `<nav aria-label="Abschnitte"><a href="#kassensturz">Kassensturz</a><a href="#stimmung">Stimmung</a><a href="#wuensche">Wünsche</a><a href="#erreicht">Ziele</a></nav>`;
  const actions = `<div class="actions">
      <span class="status cap" id="status" data-s="${statusKey}">${statusText()}</span>
      <button class="btn primary" id="b-new" data-a="new">${ic('plus')}Neuer Wunsch</button>
      <button class="btn" id="b-share" data-a="share">${ic('share')}Teilen</button>
      <button class="btn" id="b-export" data-a="export">${ic('note')}Obsidian</button>
      <button class="btn icon" id="b-settings" data-a="settings" aria-label="Einstellungen" title="Einstellungen">${ic('sliders')}</button>
    </div>`;
  const notes = updateNote()
    + (backupDue() ? `<div class="note warn bar" role="status"><span class="cap">Sicherung</span><p>${lastBackup ? 'Deine letzte Sicherung ist vom ' + fmtDate(lastBackup) + ', also älter als 30 Tage.' : 'Du hast noch keine Sicherung gespeichert.'} Das Handy kann Website-Daten löschen, eine Sicherung schützt deine Liste.</p><button class="btn small" data-a="dl-json">${ic('download')}Sicherung speichern</button></div>` : '')
    + (statusKey === 'error' ? `<div class="note err bar" role="alert"><span class="cap">Fehler</span><p>${storageFail ? 'Speichern auf diesem Gerät ist nicht möglich, zum Beispiel im privaten Modus. Deine Änderungen gehen beim Schließen verloren.' : 'Die letzte Änderung wurde nicht gespeichert.'}</p><button class="btn small" data-a="retry">Erneut speichern</button></div>` : '')
    + (hasEx ? `<div class="note bar"><span class="cap">Beispiele</span><p>Die Einträge mit <span class="tag acc">Beispiel</span> zeigen, wie die Liste funktioniert. Bearbeitest du einen, gehört er dir.</p><button class="btn small" id="b-exrm" data-a="examples-remove">${ic('trash')}Beispiele entfernen</button></div>` : '');
  const panel = `<div class="tabs" role="tablist" aria-label="Ansicht">
        ${tabBtn('list', 'Liste', open.length)}${tabBtn('matrix', 'Wollen & Brauchen')}${tabBtn('done', 'Erfüllt', done.length)}
      </div>
      <div role="tabpanel" id="panel" aria-labelledby="tab-${ui.tab}">${ui.tab === 'matrix' ? renderMatrix(open) : ui.tab === 'done' ? renderDone(done) : renderList(open)}</div>`;
  return `${runhead(nav)}<main class="wrap">
  ${hero(['Wünsche', 'Sparziele', 'Geschenkideen'], actions)}
  ${notes}
  ${sec(1, 'kassensturz', 'Kassensturz', renderReceipt())}
  ${sec(2, 'stimmung', 'Stimmung', renderMood())}
  ${sec(3, 'wuensche', 'Wünsche', panel)}
  ${sec(4, 'erreicht', 'Als Nächstes erreicht', renderNext(open))}
</main>`;
}
const BACKUP_DAYS = 30;
function backupDue() {
  if (!state.wishes.length) return false;
  if (!lastBackup) return true;
  const [y, m, d] = lastBackup.split('-').map(Number);
  return (Date.now() - new Date(y, m - 1, d).getTime()) / 864e5 > BACKUP_DAYS;
}
function updateNote() {
  return updateReg ? `<div class="note info bar" role="status"><span class="cap">Update</span><p>Neue Version verfügbar.</p><button class="btn small" data-a="reload-update">Neu laden</button></div>` : '';
}
const tabBtn = (k, label, n) => `<button class="tab" role="tab" id="tab-${k}" aria-controls="panel" tabindex="${ui.tab === k ? 0 : -1}" data-a="tab" data-v="${k}" aria-selected="${ui.tab === k}">${label}${n != null ? `<span class="count">${n}</span>` : ''}</button>`;

function statusText() {
  return ({ saved: 'Gespeichert', pending: 'Ungespeicherte Änderung', saving: 'Speichert …', error: 'Nicht gespeichert' })[statusKey] || '';
}
function setStatus(k) { statusKey = k; const el = $('#status'); if (el) { el.dataset.s = k; el.textContent = statusText(); } }

function renderList(open) {
  const cats = [...new Set(open.map(w => w.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
  if (ui.cat && !cats.includes(ui.cat)) ui.cat = '';
  let items = open.filter(w => ui.filter === 'all' || (ui.filter === 'gift' ? w.gift : !w.gift)).filter(w => !ui.cat || w.category === ui.cat);
  const rankMap = new Map(open.slice().sort(byPrio).map((w, i) => [w.id, i + 1]));
  const sorters = {
    prio: byPrio,
    'price-asc': (a, b) => priceOf(a) - priceOf(b),
    'price-desc': (a, b) => priceOf(b) - priceOf(a),
    eta: (a, b) => etaKey(a).localeCompare(etaKey(b)),
    new: (a, b) => b.created.localeCompare(a.created)
  };
  items.sort(sorters[ui.sort] || byPrio);
  const toolbar = `<div class="toolbar">
    <div class="seg" role="group" aria-label="Filter">
      ${segBtn('all', 'Alle')}${segBtn('mine', 'Nur für mich')}${segBtn('gift', 'Geschenkideen')}
    </div>
    <span class="grow"></span>
    ${cats.length ? `<select class="sel" id="f-catsel" aria-label="Kategorie"><option value="">Alle Kategorien</option>${cats.map(c => `<option ${c === ui.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : ''}
    <select class="sel" id="f-sort" aria-label="Sortierung">
      ${[['prio', 'Nach Priorität'], ['eta', 'Bald erreicht zuerst'], ['price-asc', 'Preis aufsteigend'], ['price-desc', 'Preis absteigend'], ['new', 'Neueste zuerst']].map(([v, l]) => `<option value="${v}" ${ui.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
    </select>
  </div>`;
  if (!open.length) return toolbar + `<div class="empty"><p>Noch keine Wünsche auf der Liste.</p><button class="btn primary" data-a="new">${ic('plus')}Ersten Wunsch eintragen</button></div>`;
  if (!items.length) return toolbar + `<div class="empty"><p>Kein Wunsch passt zu diesem Filter.</p></div>`;
  return toolbar + `<div class="list">${items.map(w => wishCard(w, rankMap.get(w.id))).join('')}</div>`;
}
const segBtn = (k, l) => `<button id="seg-${k}" data-a="filter" data-v="${k}" aria-pressed="${ui.filter === k}">${l}</button>`;
function etaKey(w) { const e = eta(w); return e.reached ? '0' : e.date ? '1' + e.date : e.noRate ? '8' : '9'; }

function thumb(w, cls = 'thumb') {
  return `<div class="${cls}" aria-hidden="true">${w.image ? `<img src="${esc(w.image)}" alt="">` : esc((w.name[0] || '?').toUpperCase())}</div>`;
}
function shopLinks(w) {
  if (!w.shops.length) return '';
  const p = priceOf(w);
  return `<div class="shops">${w.shops.map(s => {
    const label = s.label || host(s.url) || 'Shop';
    const inner = `<span>${esc(label)}</span>${s.price != null ? `<span class="sp">${eur(s.price)}</span>` : ''}${s.url ? ic('ext') : ''}`;
    const best = s.price != null && s.price === p && w.shops.filter(x => x.price != null).length > 1 ? ' best' : '';
    return s.url ? `<a class="shop${best}" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : `<span class="shop${best}">${inner}</span>`;
  }).join('')}</div>`;
}
const meter = (label, v, k) => `<span class="meter ${k}">${label}<span class="bar"><i style="width:${v * 10}%"></i></span><b>${v}</b></span>`;

function saveLine(w) {
  const p = priceOf(w), s = saved(w), e = eta(w);
  const pct = p ? clamp(s / p * 100, 0, 100) : 0;
  if (e.reached) return `<div class="save"><div class="progress reached"><i style="width:100%"></i></div><p class="reached-t">Ziel erreicht: ${eur(s)} zurückgelegt. Kann gekauft werden.</p></div>`;
  if (e.noPrice) return w.rate ? `<div class="save"><p><b>${eur(s)}</b> gespart · ${eur(w.rate)}/Monat · Preis fehlt noch</p></div>` : '';
  if (w.rate) return `<div class="save"><div class="progress"><i style="width:${pct}%"></i></div><p><b>${eur(s)}</b> von ${eur(p)} · ${eur(w.rate)}/Monat · ${e.date ? 'fertig ca. ' + fmtMonth(e.date) : 'in weiter Ferne'}</p></div>`;
  if (s > 0) return `<div class="save"><div class="progress"><i style="width:${pct}%"></i></div><p><b>${eur(s)}</b> von ${eur(p)} gespart · keine Monatsrate</p></div>`;
  return `<div class="save"><p class="muted">Kein Sparplan${w.gift ? ' · vielleicht schenkt es dir jemand' : ''}</p></div>`;
}

function wishCard(w, rank) {
  const p = priceOf(w);
  const rk = ui.sort === 'prio' && rank ? `<span class="tag inv" title="Rang bei aktueller Stimmung">№ ${rank}</span>` : '';
  const meta = rk + (w.category ? `<span class="tag">${esc(w.category)}</span>` : '') + (w.variant ? `<span>${esc(w.variant)}</span>` : '') + (w.example ? '<span class="tag acc">Beispiel</span>' : '');
  return `<article class="wish" data-id="${esc(w.id)}">
    ${thumb(w)}
    <div class="w-body">
      <div class="w-top"><h3 class="w-name">${esc(w.name)}</h3><div class="w-price">${p ? eur(p) : '<span class="muted" style="font-size:14px;font-weight:400;font-family:var(--sans)">Preis offen</span>'}</div></div>
      ${meta ? `<div class="w-meta">${meta}</div>` : ''}
      ${w.note ? `<p class="w-note">${esc(w.note)}</p>` : ''}
      ${shopLinks(w)}
      <div class="w-prio">${meter('Wollen', w.want, 'want')}${meter('Brauchen', w.need, 'need')}<span class="score tag" title="Priorität bei aktueller Stimmung">${fmt1(score(w))}</span></div>
      ${saveLine(w)}
      <div class="w-actions">
        <button class="switch" role="switch" id="gift-${esc(w.id)}" data-a="gift" data-id="${esc(w.id)}" aria-checked="${w.gift}" title="Für andere sichtbar machen"><span class="track"></span>Geschenkidee</button>
        <span class="spacer"></span>
        <button class="btn small ghost" data-a="deposit" data-id="${esc(w.id)}">${ic('coin')}Sparen</button>
        <button class="btn small ghost" data-a="done" data-id="${esc(w.id)}">${ic('check')}Erfüllt</button>
        <button class="btn small ghost" data-a="edit" data-id="${esc(w.id)}">${ic('pencil')}Bearbeiten</button>
      </div>
    </div>
  </article>`;
}

function renderReceipt() {
  const t = totals();
  const tr = (l, v, cls = '') => `<tr class="${cls}"><td>${l}</td><td class="num">${v}</td></tr>`;
  const kpi = (l, v, cls = '') => `<div class="kpi"><div class="cap muted">${l}</div><div class="v ${cls}">${v}</div></div>`;
  let budgetRows = '';
  if (state.budget > 0) {
    const diff = state.budget - t.rates;
    budgetRows = tr('Sparbudget pro Monat', eur(state.budget)) + (diff >= 0 ? tr('Frei im Budget', eur(diff)) : tr('Über Budget <span class="tag acc">Achtung</span>', eur(-diff)));
  }
  return `<div class="grid kpis">${kpi('Offene Wünsche', t.n)}${kpi('Gesamtwert', eur(t.total), 'acc')}${kpi('Schon gespart', eur(t.sav))}${kpi('Noch zu sparen', eur(t.rest))}</div>
  <div class="table-scroll"><table class="data"><caption class="sr">Kassensturz</caption>
    <thead><tr><th scope="col">Posten</th><th scope="col" class="num">Betrag</th></tr></thead>
    <tbody>${tr('Geschenkideen', eur(t.gift), 'sub')}${tr('Nur für mich', eur(t.mine), 'sub')}${tr('Sparraten pro Monat', eur(t.rates))}${budgetRows}${tr('Alles erreicht', t.last ? fmtMonth(t.last) : '–', 'sum')}</tbody>
  </table></div>
  <p class="stand cap">Stand ${fmtDate(TODAY())}</p>`;
}

function moodText() {
  const h = Math.round(wantWeight() * 100);
  if (h >= 65) return `Heute zählt vor allem, was du willst (${h} % Herz).`;
  if (h <= 35) return `Heute zählt vor allem, was du brauchst (${100 - h} % Kopf).`;
  return `Herz und Kopf halten sich die Waage (${h} : ${100 - h}).`;
}
function renderMood() {
  return `<div class="card">
    <h3>Herz oder Kopf?</h3>
    <input type="range" class="mood" id="mood" min="0" max="100" step="5" value="${state.mood}" aria-label="Gewichtung zwischen Wollen und Brauchen">
    <div class="mood-labels cap"><span class="h">Herz · Wollen</span><span>Kopf · Brauchen</span></div>
    <p class="mood-t" id="mood-t">${moodText()} Die Reihenfolge passt sich an.</p>
  </div>`;
}

function renderNext(open) {
  const rows = open.map(w => ({ w, e: eta(w) })).filter(x => x.e.reached || x.e.date)
    .sort((a, b) => (a.e.reached ? '0' : a.e.date).localeCompare(b.e.reached ? '0' : b.e.date)).slice(0, 5);
  const body = rows.length ? `<ul class="next">${rows.map(({ w, e }) => {
    const p = priceOf(w), pct = p ? clamp(saved(w) / p * 100, 0, 100) : 0;
    return `<li><span class="n">${esc(w.name)}</span>${e.reached ? '<span class="d ok">erreicht</span>' : `<span class="d">${fmtMonth(e.date)}</span>`}<div class="progress${e.reached ? ' reached' : ''}"><i style="width:${pct}%"></i></div></li>`;
  }).join('')}</ul>` : `<p class="note-line">Sobald ein Wunsch eine Monatsrate hat, siehst du hier, wann er erreicht ist.</p>`;
  return body;
}

/* Matrix */
const MX = { x0: 44, x1: 332, y0: 14, y1: 302 };
const vx = v => MX.x0 + (v - 0.5) / 10 * (MX.x1 - MX.x0);
const vy = v => MX.y1 - (v - 0.5) / 10 * (MX.y1 - MX.y0);
function renderMatrix(open) {
  const maxP = Math.max(1, ...open.map(priceOf));
  const midX = vx(5.5), midY = vy(5.5);
  let g = `<rect class="q" x="${MX.x0}" y="${MX.y0}" width="${MX.x1 - MX.x0}" height="${MX.y1 - MX.y0}"/>`;
  g += `<rect class="q hot" x="${midX}" y="${MX.y0}" width="${MX.x1 - midX}" height="${midY - MX.y0}"/>`;
  g += `<line class="grid" x1="${midX}" y1="${MX.y0}" x2="${midX}" y2="${MX.y1}"/><line class="grid" x1="${MX.x0}" y1="${midY}" x2="${MX.x1}" y2="${midY}"/>`;
  g += `<text class="ql" x="${MX.x1 - 8}" y="${MX.y0 + 16}" text-anchor="end">Jetzt dran</text>`;
  g += `<text class="ql" x="${MX.x0 + 8}" y="${MX.y0 + 16}">Vernünftig</text>`;
  g += `<text class="ql" x="${MX.x1 - 8}" y="${MX.y1 - 8}" text-anchor="end">Gönn dir</text>`;
  g += `<text class="ql" x="${MX.x0 + 8}" y="${MX.y1 - 8}">Kann warten</text>`;
  for (let v = 1; v <= 10; v++) {
    g += `<text class="tick" x="${vx(v)}" y="${MX.y1 + 13}" text-anchor="middle">${v}</text>`;
    g += `<text class="tick" x="${MX.x0 - 7}" y="${vy(v) + 3}" text-anchor="end">${v}</text>`;
  }
  g += `<text class="ax-w" x="${MX.x1}" y="${MX.y1 + 30}" text-anchor="end">Wollen →</text>`;
  g += `<text class="ax-n" transform="translate(13 ${MX.y0}) rotate(-90)" text-anchor="end">Brauchen →</text>`;
  const dots = open.slice().sort((a, b) => priceOf(b) - priceOf(a)).map(w => {
    const r = 6 + 11 * Math.sqrt(priceOf(w) / maxP);
    const x = vx(w.want), y = vy(w.need);
    const right = w.want <= 5;
    const name = w.name.length > 18 ? w.name.slice(0, 17) + '…' : w.name;
    return `<g class="dot${w.gift ? ' gift' : ''}" id="dot-${esc(w.id)}" data-id="${esc(w.id)}" tabindex="0" role="slider" aria-label="${esc(w.name)}: Wollen ${w.want}, Brauchen ${w.need}" aria-valuetext="Wollen ${w.want}, Brauchen ${w.need}" transform="translate(${x} ${y})">
      <circle r="${r.toFixed(1)}"/><text x="${right ? r + 4 : -(r + 4)}" y="3.5" text-anchor="${right ? 'start' : 'end'}">${esc(name)}</text></g>`;
  }).join('');
  const ranked = open.slice().sort(byPrio);
  return `<div class="matrix-wrap">
    <div class="matrix-card">
      <svg class="matrix" id="matrix" viewBox="0 0 340 340" role="group" aria-label="Wollen-Brauchen-Matrix">${g}${dots}</svg>
      <p class="hint"><span>Punkte ziehen oder mit Pfeiltasten verschieben.</span><span>Größe = Preis</span><span><i class="legend-dot gift"></i>Geschenkidee (gefüllt)</span><span><i class="legend-dot own"></i>Nur für mich (hohl)</span></p>
    </div>
    <div>
      <p class="cap muted" style="margin:0 0 8px">Reihenfolge bei aktueller Stimmung</p>
      ${ranked.length ? `<ol class="ranked">${ranked.map(w => `<li><span class="n">${esc(w.name)}</span><span class="s">${fmt1(score(w))}</span></li>`).join('')}</ol>` : '<p class="note-line">Noch keine offenen Wünsche.</p>'}
    </div>
  </div>`;
}

function renderDone(done) {
  if (!done.length) return `<div class="empty"><p>Hier landen Wünsche, die du dir erfüllt hast oder geschenkt bekommen hast.</p></div>`;
  const sum = done.reduce((a, w) => a + priceOf(w), 0);
  done = done.slice().sort((a, b) => b.done.date.localeCompare(a.done.date));
  return `<p class="note-line" style="margin-bottom:12px">${done.length} ${done.length === 1 ? 'Wunsch' : 'Wünsche'} erfüllt, zusammen ${eur(sum)}.</p>
  <div class="list">${done.map(w => `<div class="done-row">
    ${thumb(w)}
    <div><h3>${esc(w.name)}</h3><p>${w.done.how === 'geschenkt' ? 'Geschenkt bekommen' + (w.done.from ? ' von ' + esc(w.done.from) : '') : 'Selbst gekauft'} am ${fmtDate(w.done.date)}${priceOf(w) ? ' · ' + eur(priceOf(w)) : ''}</p></div>
    <div class="acts">${pendingDelete === w.id
      ? `<span class="confirm">Endgültig löschen? <button class="btn small danger solid" data-a="delete" data-id="${esc(w.id)}">Löschen</button><button class="btn small" data-a="delete-cancel">Abbrechen</button></span>`
      : `<button class="btn small ghost" data-a="reopen" data-id="${esc(w.id)}">${ic('undo')}Wieder offen</button><button class="btn small ghost danger" data-a="delete-ask" data-id="${esc(w.id)}" aria-label="Löschen">${ic('trash')}</button>`}</div>
  </div>`).join('')}</div>`;
}

/* Viewer (gift) page */
function giftItems() { return openWishes().filter(w => w.gift).sort(byPrio); }
function renderViewer() {
  if (viewError) return `${runhead('', 'Geschenkideen')}<main class="wrap"><section class="hero"><h1>Wunschliste</h1><div class="subtitle cap">Geschenkideen</div></section><hr class="rule-heavy"><div class="note err"><span class="cap">Fehler</span>${esc(viewError)}</div></main>`;
  const V = viewData || { o: state.owner, u: state.updated, i: [] };
  const owner = V.o;
  const items = V.i.map(x => ({ name: x.n, variant: x.v || '', p: x.p || 0, image: x.m || '', top: !!x.t, shops: x.s }));
  const lede = `Falls du ${esc(owner)} eine Freude machen möchtest: Darüber würde ${esc(owner)} sich freuen.`;
  const prev = preview && mode === 'owner' ? `<div class="note info bar"><span class="cap">Vorschau</span><p>So sehen andere deine Liste. Notizen, Bewertungen und Sparstände bleiben verborgen.</p><button class="btn small" data-a="preview-off">${ic('undo')}Zurück zur Liste</button></div>` : '';
  const grid = items.length ? `<div class="gift-grid">${items.map(w => {
      const p = w.p;
      return `<article class="gcard">
        <div class="gimg">${w.image ? `<img src="${esc(w.image)}" alt="">` : esc((w.name[0] || '?').toUpperCase())}${w.top ? '<span class="tag inv">Top-Wunsch</span>' : ''}</div>
        <div class="gbody">
          <h3>${esc(w.name)}</h3>
          ${w.variant ? `<p class="v">${esc(w.variant)}</p>` : ''}
          ${p ? `<div class="gprice">${eur(p)}</div>` : ''}
          ${w.shops.some(s => s.url) ? `<div class="gshops">${w.shops.filter(s => s.url).map(s => `<a class="gshop" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(s.label || host(s.url))}</span><span class="sp">${s.price != null ? eur(s.price) + ' ' : ''}${ic('ext')}</span></a>`).join('')}</div>` : ''}
        </div>
      </article>`;
    }).join('')}</div><p class="gfoot">Stand ${fmtLong(V.u)}. Tipp: Sprecht euch kurz ab, damit nichts doppelt verschenkt wird.</p>`
    : `<div class="empty"><p>Gerade sind keine Geschenkideen freigegeben.</p></div>`;
  return `${runhead('', owner, V.u)}<main class="wrap">
    ${hero(['Geschenkideen', 'Preise', 'Links'], '', lede, owner)}
    ${updateNote()}${prev}
    ${sec(1, 'ideen', 'Geschenkideen', grid)}
  </main>`;
}

/* ---------- Speichern (IndexedDB) ---------- */
const DB_NAME = 'wunschliste', DB_STORE = 'kv';
let dbp = null;
function openDb() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('no-idb')); return; }
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains(DB_STORE)) rq.result.createObjectStore(DB_STORE); };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
    rq.onblocked = () => rej(new Error('blocked'));
  });
  dbp.catch(() => { dbp = null; });
  return dbp;
}
async function dbGet(key) {
  const db = await openDb();
  return new Promise((res, rej) => { const rq = db.transaction(DB_STORE).objectStore(DB_STORE).get(key); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
}
async function dbPut(entries) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readwrite'); const st = tx.objectStore(DB_STORE);
    for (const k in entries) st.put(entries[k], k);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  });
}

let saveTimer = null, dirty = false, saving = false, retried = false;
function commit(opts = {}) {
  if (mode === 'viewer') return;                // Ansicht für andere schreibt nie
  state.updated = TODAY();
  dirty = true;
  if (!opts.noRender) render();
  setStatus('pending');
  scheduleSave(opts.delay != null ? opts.delay : 600);
}
function scheduleSave(ms) { clearTimeout(saveTimer); saveTimer = setTimeout(doSave, ms); }
async function doSave() {
  if (!dirty || saving || mode === 'viewer') return;
  saving = true; setStatus('saving');
  dirty = false;
  try {
    await dbPut({ state: JSON.parse(JSON.stringify(state)) });
    if (dirty) { setStatus('pending'); scheduleSave(300); } else { retried = false; setStatus('saved'); }
  } catch (e) {
    dirty = true;
    if (!retried) { retried = true; setStatus('pending'); scheduleSave(1500); }
    else { setStatus('error'); render(); }
  } finally { saving = false; }
}
async function flushSave() { clearTimeout(saveTimer); await doSave(); }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty) flushSave(); });
window.addEventListener('pagehide', () => { if (dirty) flushSave(); });

async function setLastBackup() {
  lastBackup = TODAY();
  try { await dbPut({ lastBackup }); } catch (e) {}
  const el = $('#last-backup'); if (el) el.textContent = fmtDate(lastBackup);
  render();
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }

/* ---------- Dialog ---------- */
const dlg = $('#dlg');
function openDialog(html) { $('#dlg-body').innerHTML = html; if (!dlg.open) dlg.showModal(); const f = $('#dlg-body [autofocus]'); if (f) f.focus(); }
function closeDialog() { if (dlg.open) dlg.close(); }
dlg.addEventListener('close', () => { applyTheme(getTheme()); $('#dlg-body').innerHTML = ''; formImage = null; if (dirty) scheduleSave(300); });
dlg.addEventListener('click', e => { if (e.target === dlg) closeDialog(); });
const dlgHead = t => `<header class="dlg-head"><h2 id="dlg-title">${t}</h2><button type="button" class="btn icon ghost" data-a="close" aria-label="Schließen">${ic('x')}</button></header>`;
const findWish = id => state.wishes.find(w => w.id === id);

/* Editor */
let formImage = null, editId = null;
const CATS = ['Technik', 'Kleidung', 'Wohnen', 'Hobby', 'Sport', 'Bücher', 'Erlebnisse', 'Beauty', 'Küche', 'Reisen'];
function shopRow(s = {}) {
  return `<div class="shop-row"><input class="s-label" placeholder="Shop" aria-label="Shop-Name" value="${esc(s.label || '')}"><input class="s-url" placeholder="https://…" aria-label="Link" inputmode="url" value="${esc(s.url || '')}"><input class="s-price" placeholder="Preis" aria-label="Preis in Euro" inputmode="decimal" value="${esc(numInput(s.price))}"><button type="button" class="btn icon ghost" data-a="shop-del" aria-label="Shop entfernen">${ic('x')}</button></div>`;
}
function imgDropInner() { return formImage ? `<img src="${esc(formImage)}" alt="Vorschau">` : 'Bild hier ablegen oder einfügen'; }
function openEditor(id) {
  editId = id || null;
  const w = id ? findWish(id) : { name: '', category: '', variant: '', note: '', image: '', shops: [], price: null, want: 5, need: 5, gift: false, rate: 0, start: TODAY() };
  formImage = w.image || null;
  pendingDelete = null;
  const cats = [...new Set(CATS.concat(state.wishes.map(x => x.category).filter(Boolean)))];
  openDialog(`<form class="dlg" id="f-wish" novalidate>
    ${dlgHead(id ? 'Wunsch bearbeiten' : 'Neuer Wunsch')}
    <div class="dlg-scroll">
      <label class="field"><span>Was wünschst du dir?</span><input id="f-name" required maxlength="120" value="${esc(w.name)}" autofocus autocomplete="off"></label>
      <div class="img-row">
        <div class="img-drop${formImage ? ' has' : ''}" id="img-drop" tabindex="0" role="button" aria-label="Bild auswählen">${imgDropInner()}</div>
        <div class="img-btns">
          <label class="btn small">${ic('upload')}Bild wählen<input type="file" accept="image/*" id="f-file" hidden></label>
          <button type="button" class="btn small ghost" data-a="img-remove"${formImage ? '' : ' hidden'} id="img-rm">${ic('trash')}Bild entfernen</button>
          <span>Auch per Einfügen (Strg/Cmd + V).<br>Wird verkleinert gespeichert.</span>
        </div>
      </div>
      <div class="grid2">
        <label class="field"><span>Kategorie</span><input id="f-cat" list="cat-list" value="${esc(w.category)}" autocomplete="off"><datalist id="cat-list">${cats.map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist></label>
        <label class="field"><span>Variante <small>Größe, Farbe, Modell</small></span><input id="f-variant" value="${esc(w.variant)}"></label>
      </div>
      <label class="field"><span>Notiz <small>nur für dich sichtbar</small></span><input id="f-note" value="${esc(w.note)}"></label>
      <fieldset><legend>Wo gibt es das? <small>der günstigste Preis zählt</small></legend>
        <div id="shop-rows" style="display:grid;gap:8px">${(w.shops.length ? w.shops : [{}]).map(shopRow).join('')}</div>
        <div><button type="button" class="btn small" data-a="shop-add">${ic('plus')}Weiteren Shop</button></div>
      </fieldset>
      <label class="field"><span>Preis <small>falls oben kein Shop-Preis steht</small></span><input id="f-price" inputmode="decimal" placeholder="z. B. 49,90" value="${esc(numInput(w.price))}"></label>
      <fieldset><legend>Wie wichtig ist es dir?</legend>
        <div class="slider want"><span>Wollen</span><input type="range" id="f-want" min="1" max="10" value="${w.want}"><output id="o-want">${w.want}</output></div>
        <div class="slider need"><span>Brauchen</span><input type="range" id="f-need" min="1" max="10" value="${w.need}"><output id="o-need">${w.need}</output></div>
      </fieldset>
      <label class="check"><input type="checkbox" id="f-gift" ${w.gift ? 'checked' : ''}><span>Als Geschenkidee freigeben<br><small>Erscheint mit Preis und Links in der Ansicht für andere.</small></span></label>
      <fieldset><legend>Sparziel</legend>
        <div class="grid2">
          <label class="field"><span>Monatsrate (€)</span><input id="f-rate" inputmode="decimal" placeholder="0" value="${esc(w.rate ? numInput(w.rate) : '')}"></label>
          <label class="field"><span>Sparbeginn <small>erste Rate</small></span><input type="date" id="f-start" value="${esc(w.start)}"></label>
        </div>
        <div class="calc"><label class="field"><span>Oder: fertig bis</span><input type="month" id="f-target" min="${TODAY().slice(0, 7)}"></label><button type="button" class="btn small" data-a="calc-rate">Rate ausrechnen</button></div>
        <p class="note-line" id="calc-out">Ab dem Sparbeginn wird jeden Monat die Rate gutgeschrieben. Extra-Einzahlungen und Korrekturen buchst du über „Sparen“.</p>
      </fieldset>
    </div>
    <footer class="dlg-foot">
      ${id ? `<span id="del-zone"><button type="button" class="btn small ghost danger" data-a="edit-del-ask">${ic('trash')}Löschen</button></span>` : ''}
      <span class="spacer"></span>
      <button type="button" class="btn" data-a="close">Abbrechen</button>
      <button type="submit" class="btn primary">${id ? 'Speichern' : 'Hinzufügen'}</button>
    </footer>
  </form>`);
}
function readShops() {
  return $$('#shop-rows .shop-row').map(r => {
    const url = safeUrl(r.querySelector('.s-url').value);
    let label = str(r.querySelector('.s-label').value);
    if (!label && url) label = host(url);
    return { label, url, price: parseNum(r.querySelector('.s-price').value) };
  }).filter(s => s.url || s.label);
}
function submitEditor() {
  const name = str($('#f-name').value);
  if (!name) { $('#f-name').focus(); toast('Gib dem Wunsch einen Namen.'); return; }
  const data = {
    name, category: str($('#f-cat').value), variant: str($('#f-variant').value), note: str($('#f-note').value),
    image: formImage || '', shops: readShops(), price: parseNum($('#f-price').value),
    want: +$('#f-want').value, need: +$('#f-need').value, gift: $('#f-gift').checked,
    rate: Math.max(0, parseNum($('#f-rate').value) || 0), start: validDate($('#f-start').value) || TODAY()
  };
  if (editId) { const w = findWish(editId); Object.assign(w, data, { example: false }); }
  else state.wishes.push(normWish(Object.assign({ id: uid(), created: TODAY(), deposits: [], anchor: null, done: null }, data)));
  closeDialog();
  commit();
  toast(editId ? 'Änderungen übernommen' : 'Wunsch hinzugefügt');
}
function calcRate() {
  const out = $('#calc-out');
  const tm = $('#f-target').value;
  if (!/^\d{4}-\d{2}$/.test(tm)) { out.textContent = 'Wähle zuerst einen Monat.'; return; }
  const shops = readShops(); const ps = shops.map(s => s.price).filter(p => p != null && p > 0);
  const price = ps.length ? Math.min(...ps) : parseNum($('#f-price').value);
  if (!price) { out.textContent = 'Trag zuerst einen Preis ein.'; return; }
  const start = validDate($('#f-start').value) || TODAY();
  const [y, m] = tm.split('-').map(Number);
  const end = ymd(y, m, new Date(y, m, 0).getDate());
  const w = editId ? findWish(editId) : null;
  const after = w && w.anchor ? w.anchor.date : null;
  const base = w ? baseOf(w, end) : 0;
  const n = countInstallments(start, 1, after, end);
  if (n < 1) { out.textContent = 'Bis dahin fällt keine Rate an. Wähle einen späteren Monat oder einen früheren Sparbeginn.'; return; }
  const rate = Math.max(0, Math.ceil((price - base) / n));
  $('#f-rate').value = numInput(rate);
  out.textContent = `${n} ${n === 1 ? 'Rate' : 'Raten'} bis ${fmtMonth(end)}: ${eur(rate)} pro Monat.`;
}

/* Deposit dialog */
function openDeposit(id) {
  const w = findWish(id); if (!w) return;
  const p = priceOf(w), s = saved(w), e = eta(w);
  const after = w.anchor ? w.anchor.date : null;
  const n = countInstallments(w.start, w.rate, after, TODAY());
  const hist = [];
  if (w.rate) hist.push(`<li><span>${n} automatische ${n === 1 ? 'Rate' : 'Raten'} à ${eur(w.rate)}${after ? ' seit ' + fmtDate(after) : ' seit ' + fmtDate(w.start)}</span><span class="amt">${eur(n * w.rate)}</span></li>`);
  if (w.anchor) hist.push(`<li><span>Stand korrigiert am ${fmtDate(w.anchor.date)}</span><span class="amt">${eur(w.anchor.amount)}</span></li>`);
  w.deposits.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach(d => {
    const old = after && d.date <= after;
    hist.push(`<li class="${old ? 'old' : ''}"><span>${fmtDate(d.date)}${d.note ? ' · ' + esc(d.note) : ''}${old ? ' (vor Korrektur)' : ''}${d.date > TODAY() ? ' (geplant)' : ''}</span><span style="display:flex;gap:6px;align-items:center"><span class="amt">${d.amount >= 0 ? '+' : ''}${eur(d.amount)}</span><button type="button" class="btn icon ghost" data-a="dep-del" data-id="${esc(w.id)}" data-dep="${esc(d.id)}" aria-label="Buchung löschen">${ic('x')}</button></span></li>`);
  });
  openDialog(`<div class="dlg">
    ${dlgHead('Sparen: ' + esc(w.name))}
    <div class="dlg-scroll">
      <div class="dep-sum">
        <div class="big">${eur(s)} <small>${p ? 'von ' + eur(p) : 'gespart'}</small></div>
        ${p ? `<div class="progress${e.reached ? ' reached' : ''}"><i style="width:${clamp(s / p * 100, 0, 100)}%"></i></div>` : ''}
        <p class="note-line">${e.reached ? 'Ziel erreicht.' : w.rate ? `${eur(w.rate)} pro Monat${e.date ? ', fertig ca. ' + fmtMonth(e.date) : ''}.` : 'Noch keine Monatsrate.'}</p>
      </div>
      <form class="inline-form" id="f-rate-q"><h3>Monatsrate</h3>
        <div class="row"><label class="field"><span>Rate (€ pro Monat)</span><input id="q-rate" inputmode="decimal" value="${esc(w.rate ? numInput(w.rate) : '')}" placeholder="0"></label><label class="field"><span>Sparbeginn</span><input type="date" id="q-start" value="${esc(w.start)}"></label><button class="btn" type="submit">Übernehmen</button></div>
      </form>
      <form class="inline-form" id="f-dep"><h3>Einzahlung buchen</h3>
        <div class="row"><label class="field"><span>Betrag (€)</span><input id="d-amt" inputmode="decimal" placeholder="z. B. 50 oder -20" autofocus></label><label class="field"><span>Datum</span><input type="date" id="d-date" value="${TODAY()}"></label></div>
        <div class="row"><label class="field"><span>Notiz</span><input id="d-note" placeholder="z. B. Geburtstagsgeld"></label><button class="btn primary" type="submit">Buchen</button></div>
        <p class="fine">Extra-Geld zusätzlich zur Rate. Ein Minusbetrag bucht eine Entnahme.</p>
      </form>
      <form class="inline-form" id="f-fix"><h3>Stand korrigieren</h3>
        <p class="fine">Lief es anders als geplant? Trag ein, was heute wirklich zurückgelegt ist. Ab morgen rechnet die Liste mit deiner Rate weiter.</p>
        <div class="row"><label class="field"><span>Tatsächlich gespart (€)</span><input id="x-amt" inputmode="decimal" placeholder="${esc(numInput(s))}"></label><button class="btn" type="submit">Übernehmen</button></div>
      </form>
      ${hist.length ? `<div><h3 style="font-size:15px;margin-bottom:6px">Verlauf</h3><ul class="hist">${hist.join('')}</ul></div>` : ''}
    </div>
    <footer class="dlg-foot"><span class="spacer"></span><button type="button" class="btn" data-a="close">Fertig</button></footer>
  </div>`);
  $('#dlg-body').dataset.wid = id;
}

/* Done dialog */
function openDone(id) {
  const w = findWish(id); if (!w) return;
  openDialog(`<form class="dlg" id="f-done">
    ${dlgHead('Erfüllt: ' + esc(w.name))}
    <div class="dlg-scroll">
      <label class="check"><input type="radio" name="how" value="gekauft" checked style="accent-color:var(--ink)"><span>Selbst gekauft</span></label>
      <label class="check"><input type="radio" name="how" value="geschenkt" style="accent-color:var(--accent)"><span>Geschenkt bekommen</span></label>
      <div class="grid2">
        <label class="field"><span>Von wem? <small>optional</small></span><input id="dn-from" placeholder="z. B. Mama"></label>
        <label class="field"><span>Wann?</span><input type="date" id="dn-date" value="${TODAY()}"></label>
      </div>
      <p class="note-line">Der Wunsch wandert unter „Erfüllt“ und verschwindet aus der Ansicht für andere.</p>
    </div>
    <footer class="dlg-foot"><span class="spacer"></span><button type="button" class="btn" data-a="close">Abbrechen</button><button type="submit" class="btn primary">${ic('check')}Als erfüllt markieren</button></footer>
  </form>`);
  $('#dlg-body').dataset.wid = id;
}

/* Share */
function shareText() {
  const items = giftItems();
  if (!items.length) return '';
  const lines = [possessive(state.owner) + ' Wunschliste – Geschenkideen', ''];
  items.forEach(w => {
    const p = priceOf(w);
    lines.push('• ' + w.name + (w.variant ? ' (' + w.variant + ')' : '') + (p ? ' – ' + eur(p) : ''));
    w.shops.filter(s => s.url).forEach(s => lines.push('  ' + (s.label ? s.label + ': ' : '') + s.url));
  });
  lines.push('', 'Stand ' + fmtDate(state.updated));
  return lines.join('\n');
}
/* ---------- Teilen ohne Server: Link mit #g=<komprimierte Daten> ---------- */
const SHARE_MAX = 8000;          // ab dieser Linklänge werden Vorschaubilder weggelassen
const THUMB_PX = 160;
const b64u = bytes => { let t = ''; for (let i = 0; i < bytes.length; i += 0x8000) t += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
function unb64u(t) { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; const b = atob(t), o = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }
async function pipeBytes(bytes, stream) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
const thumbCache = new Map();
async function thumbBytes(w) {
  const key = w.id + ':' + w.image.length;
  if (thumbCache.has(key)) return thumbCache.get(key);
  let out = null;
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = w.image; });
    const sc = Math.min(1, THUMB_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * sc)); c.height = Math.max(1, Math.round(img.naturalHeight * sc));
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.6));
    if (blob) out = new Uint8Array(await blob.arrayBuffer());
  } catch (e) { out = null; }
  thumbCache.set(key, out);
  return out;
}
/* Nutzlast: [1 Byte Format][4 Byte JSON-Länge][JSON][Bilder als rohe JPEG-Bytes]. Format 1 = deflate-raw, 0 = unkomprimiert. */
async function encodeShare(view, imgs) {
  const j = new TextEncoder().encode(JSON.stringify(view));
  const out = new Uint8Array(4 + j.length + imgs.reduce((a, b) => a + (b ? b.length : 0), 0));
  new DataView(out.buffer).setUint32(0, j.length); out.set(j, 4);
  let o = 4 + j.length; for (const b of imgs) if (b) { out.set(b, o); o += b.length; }
  let fmt = 0, body = out;
  if (typeof CompressionStream === 'function') { try { body = await pipeBytes(out, new CompressionStream('deflate-raw')); fmt = 1; } catch (e) { body = out; } }
  const all = new Uint8Array(body.length + 1); all[0] = fmt; all.set(body, 1);
  return b64u(all);
}
async function decodeToken(token) {
  if (!/^[A-Za-z0-9_-]+$/.test(token) || token.length > 600000) throw new Error('bad-token');
  const all = unb64u(token);
  let body = all.subarray(1);
  if (all[0] === 1) {
    if (typeof DecompressionStream !== 'function') throw new Error('no-decompress');
    body = await pipeBytes(body, new DecompressionStream('deflate-raw'));
  } else if (all[0] !== 0) throw new Error('bad-format');
  if (body.length < 5 || body.length > 8e6) throw new Error('bad-size');
  const jl = new DataView(body.buffer, body.byteOffset, body.byteLength).getUint32(0);
  if (jl > body.length - 4) throw new Error('bad-json');
  const j = JSON.parse(new TextDecoder().decode(body.subarray(4, 4 + jl)));
  let off = 4 + jl;
  const items = (Array.isArray(j.i) ? j.i : []).slice(0, 200).map(x => {
    if (!x || typeof x !== 'object') return null;
    let m = '';
    const ml = Math.round(num(x.m, 0));
    if (ml > 0 && off + ml <= body.length) {
      const jb = body.subarray(off, off + ml); off += ml;
      if (jb[0] === 0xFF && jb[1] === 0xD8) m = 'data:image/jpeg;base64,' + btoa(Array.from(jb, c => String.fromCharCode(c)).join(''));
    }
    return {
      n: str(x.n) || 'Ohne Namen', v: str(x.v), p: numOrNull(x.p) || 0, m, t: !!x.t,
      s: (Array.isArray(x.s) ? x.s : []).map(a => Array.isArray(a) ? { label: str(a[0]), url: safeUrl(a[1]), price: numOrNull(a[2]) } : null).filter(a => a && a.url)
    };
  }).filter(Boolean);
  return { o: str(j.o) || 'Anna', u: validDate(j.u) || TODAY(), i: items };
}
async function buildShare() {
  const items = giftItems();
  const topN = items.length > 3 ? 3 : 0;
  const imgs = await Promise.all(items.map(w => w.image ? thumbBytes(w) : null));
  const total = imgs.filter(Boolean).length;
  const make = () => ({
    o: state.owner, u: state.updated,
    i: items.map((w, k) => {
      const x = { n: w.name, s: w.shops.filter(sh => sh.url).map(sh => [sh.label, sh.url, sh.price]) };
      if (w.variant) x.v = w.variant;
      if (priceOf(w)) x.p = priceOf(w);
      if (k < topN) x.t = 1;
      if (imgs[k]) x.m = imgs[k].length;
      return x;
    })
  });
  let token = await encodeShare(make(), imgs);
  const base = location.origin + location.pathname;
  for (let k = imgs.length - 1; k >= 0 && base.length + SHARE_PREFIX.length + token.length > SHARE_MAX; k--) {
    if (!imgs[k]) continue;
    imgs[k] = null; token = await encodeShare(make(), imgs);
  }
  return { url: base + SHARE_PREFIX + token, token, count: items.length, omitted: total - imgs.filter(Boolean).length };
}
let shareUrl = '';
async function openShare() {
  const n = giftItems().length;
  openDialog(`<div class="dlg">
    ${dlgHead('Teilen')}
    <div class="dlg-scroll">
      <section class="share-sec"><h3>Als Link</h3>
        ${n ? `<p>Der Link enthält ${n === 1 ? 'deine Geschenkidee' : `deine ${n} Geschenkideen`} mit Preis, Shops und kleinem Vorschaubild. Wer ihn öffnet, sieht sie ohne Anmeldung. Notizen, Wollen und Brauchen, Sparstände und Raten sind nie enthalten.</p>
        <label class="field"><span class="sr" hidden>Link</span><textarea id="share-link" readonly>Link wird erstellt …</textarea></label>
        <p class="fine" id="share-hint" hidden></p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn primary" id="b-sharelink" data-a="share-link" disabled>${ic('share')}Link teilen</button>
          <button class="btn" id="b-copylink" data-a="copy" data-target="share-link" disabled>${ic('copy')}Link kopieren</button>
          <button class="btn" data-a="preview-on">${ic('eye')}So sehen es andere</button>
        </div>` : `<p>Noch keine Geschenkidee freigegeben. Schalte bei einem Wunsch „Geschenkidee“ ein.</p>`}
      </section>
      <section class="share-sec"><h3>Als Nachricht</h3>
        ${n ? `<p>Zum Einfügen in WhatsApp, Signal oder eine E-Mail.</p>
        <label class="field"><span class="sr" hidden>Text</span><textarea id="share-text" readonly>${esc(shareText())}</textarea></label>
        <div><button class="btn primary" data-a="copy" data-target="share-text">${ic('copy')}Text kopieren</button></div>` : `<p>Noch keine Geschenkidee freigegeben.</p>`}
      </section>
      <p class="fine">Gut zu wissen: Die Daten stecken im Link selbst, es gibt keinen Server. Wer den Link hat, sieht die Geschenkideen. Änderst du später etwas, schickst du einen neuen Link.</p>
    </div>
    <footer class="dlg-foot"><span class="spacer"></span><button type="button" class="btn" data-a="close">Fertig</button></footer>
  </div>`);
  if (!n) return;
  let r = null;
  try { r = await buildShare(); } catch (e) { r = null; }
  const ta = $('#share-link'); if (!ta) return;
  if (!r) { ta.value = 'Der Link konnte nicht erstellt werden.'; return; }
  shareUrl = r.url; ta.value = r.url;
  $('#b-sharelink').disabled = false; $('#b-copylink').disabled = false;
  const hint = $('#share-hint');
  if (r.omitted > 0) { hint.textContent = `Der Link wäre zu lang geworden (über ${SHARE_MAX.toLocaleString('de-DE')} Zeichen). Bei ${r.omitted} von ${r.count} Ideen wurde deshalb das Bild weggelassen.`; hint.hidden = false; }
  else if (r.url.length > SHARE_MAX) { hint.textContent = `Der Link ist mit ${r.url.length.toLocaleString('de-DE')} Zeichen sehr lang. Manche Apps kürzen so lange Links.`; hint.hidden = false; }
}
async function sharePreview() {
  let r = null;
  try { r = await buildShare(); viewData = await decodeToken(r.token); } catch (e) { toast('Die Vorschau konnte nicht erstellt werden.'); return; }
  closeDialog(); preview = true; render(); window.scrollTo(0, 0);
}

/* Obsidian export */
const cell = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
function markdown() {
  const t = totals();
  const open = openWishes().sort(byPrio);
  const done = state.wishes.filter(w => w.done).sort((a, b) => b.done.date.localeCompare(a.done.date));
  const L = [];
  L.push('---', 'aktualisiert: ' + TODAY(), 'offene_wuensche: ' + t.n, 'gesamtwert: ' + round2(t.total), 'gespart: ' + round2(t.sav), 'sparrate_monat: ' + round2(t.rates), 'tags: [wunschliste]', '---', '');
  L.push('# ' + possessive(state.owner) + ' Wunschliste', '');
  L.push(`> Stand ${fmtDate(TODAY())} · ${t.n} offene Wünsche · Gesamtwert ${eur(t.total)} · gespart ${eur(t.sav)} · Sparraten ${eur(t.rates)}/Monat${state.budget ? ' (Budget ' + eur(state.budget) + ')' : ''}${t.last ? ' · alles erreicht ca. ' + fmtMonth(t.last) : ''}`, '');
  L.push(`Priorität gewichtet zu ${Math.round(wantWeight() * 100)} % Wollen und ${100 - Math.round(wantWeight() * 100)} % Brauchen.`, '');
  L.push('## Offene Wünsche', '');
  if (open.length) {
    L.push('| # | Wunsch | Kategorie | Preis | Wollen | Brauchen | Priorität | Gespart | Rate/Monat | Ziel ca. | Geschenkidee | Shop |');
    L.push('|---|---|---|---:|---:|---:|---:|---:|---:|---|---|---|');
    open.forEach((w, i) => {
      const e = eta(w), p = priceOf(w);
      const shop = w.shops.filter(s => s.url).map(s => `[${cell(s.label || host(s.url))}](${s.url.replace(/\)/g, '%29')})`).join(', ');
      L.push(`| ${i + 1} | ${cell(w.name)}${w.variant ? ' (' + cell(w.variant) + ')' : ''} | ${cell(w.category)} | ${p ? eur(p) : ''} | ${w.want} | ${w.need} | ${fmt1(score(w))} | ${eur(saved(w))} | ${w.rate ? eur(w.rate) : ''} | ${e.reached ? 'erreicht' : e.date ? fmtMonth(e.date) : ''} | ${w.gift ? 'ja' : ''} | ${shop} |`);
    });
  } else L.push('_Keine offenen Wünsche._');
  L.push('');
  const notes = open.filter(w => w.note);
  if (notes.length) { L.push('### Notizen', ''); notes.forEach(w => L.push(`- **${w.name}**: ${w.note}`)); L.push(''); }
  const gifts = giftItems();
  L.push('## Geschenkideen', '');
  if (gifts.length) gifts.forEach(w => { const p = priceOf(w); const shop = w.shops.find(s => s.url); L.push(`- **${w.name}**${w.variant ? ' (' + w.variant + ')' : ''}${p ? ' – ' + eur(p) : ''}${shop ? ' – [' + (shop.label || host(shop.url)) + '](' + shop.url.replace(/\)/g, '%29') + ')' : ''}`); });
  else L.push('_Keine freigegeben._');
  L.push('');
  if (done.length) { L.push('## Erfüllt', ''); done.forEach(w => L.push(`- [x] ${w.name}${priceOf(w) ? ' – ' + eur(priceOf(w)) : ''} – ${w.done.how === 'geschenkt' ? 'geschenkt' + (w.done.from ? ' von ' + w.done.from : '') : 'gekauft'} am ${fmtDate(w.done.date)}`)); L.push(''); }
  return L.join('\n');
}
function openExport() {
  openDialog(`<div class="dlg">
    ${dlgHead('Obsidian-Notiz')}
    <div class="dlg-scroll">
      <p class="note-line">Eine Übersichtsnotiz mit Eigenschaften, Tabelle, Geschenkideen und erfüllten Wünschen. Speichere sie als Datei in deinem Vault oder füge sie in eine bestehende Notiz ein.</p>
      <label class="field"><span>Vorschau</span><textarea id="md-text" readonly style="min-height:240px">${esc(markdown())}</textarea></label>
    </div>
    <footer class="dlg-foot"><span class="spacer"></span>
      <button class="btn" data-a="copy" data-target="md-text">${ic('copy')}Kopieren</button>
      ${canShareFile('Wunschliste.md', 'text/plain') ? `<button class="btn" data-a="sh-md">${ic('share')}Teilen</button>` : ''}
      <button class="btn primary" data-a="dl-md">${ic('download')}Als Wunschliste.md speichern</button>
    </footer>
  </div>`);
}

/* Settings */
function openSettings() {
  const hasEx = state.wishes.some(w => w.example);
  openDialog(`<form class="dlg" id="f-settings">
    ${dlgHead('Einstellungen')}
    <div class="dlg-scroll">
      <div class="grid2">
        <label class="field"><span>Wessen Liste?</span><input id="s-owner" value="${esc(state.owner)}" maxlength="40"></label>
        <label class="field"><span>Sparbudget pro Monat (€) <small>optional</small></span><input id="s-budget" inputmode="decimal" value="${esc(state.budget ? numInput(state.budget) : '')}" placeholder="z. B. 150"></label>
      </div>
      <p class="note-line">Das Budget wird im Kassensturz mit der Summe deiner Monatsraten verglichen.</p>
      <fieldset><legend>Darstellung <small>gilt für dieses Gerät, Vorschau sofort</small></legend>
        <div class="theme-opts">${THEMES.map(th => `<label class="check"><input type="radio" name="theme" value="${th.id}" ${getTheme() === th.id ? 'checked' : ''}><span>${th.name}</span></label>`).join('')}</div>
      </fieldset>
      <fieldset><legend>Sicherung</legend>
        <p class="note-line">Eine JSON-Datei mit allen Wünschen, Bildern und Buchungen. Dein Handy kann Website-Daten löschen, speichere deshalb ab und zu eine Sicherung.</p>
        <p class="note-line">Letzte Sicherung: <b id="last-backup">${lastBackup ? fmtDate(lastBackup) : 'noch nie'}</b></p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small" data-a="dl-json">${ic('download')}Sicherung speichern</button>
          ${canShareFile('Sicherung.json', 'application/json') ? `<button type="button" class="btn small" data-a="sh-json">${ic('share')}Sicherung teilen</button>` : ''}
          <label class="btn small">${ic('upload')}Sicherung laden<input type="file" accept="application/json,.json" id="s-import" hidden></label>
        </div>
        <div id="import-zone"></div>
      </fieldset>
      ${hasEx ? `<div><button type="button" class="btn small" data-a="examples-remove">${ic('trash')}Beispiele entfernen</button></div>` : ''}
    </div>
    <footer class="dlg-foot"><span class="spacer"></span><button type="button" class="btn" data-a="close">Abbrechen</button><button type="submit" class="btn primary">Speichern</button></footer>
  </form>`);
}
let importCandidate = null;

/* ---------- Files & clipboard ---------- */
function canShareFile(name, mime) {
  try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File(['x'], name, { type: mime })] })); } catch (e) { return false; }
}
/* Speichert über Blob + <a download>; mit how='share' über das Teilen-Menü des Geräts. Gibt true zurück, wenn gespeichert. */
async function saveFile(filename, data, mime, how) {
  if (how === 'share') {
    try { await navigator.share({ files: [new File([data], filename, { type: mime })], title: filename }); return true; }
    catch (e) { if (e && e.name === 'AbortError') return false; toast('Teilen ging nicht, die Datei wird heruntergeladen.'); }
  }
  try {
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.rel = 'noopener'; a.hidden = true;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('Datei gespeichert'); return true;
  } catch (e) { toast('Die Datei konnte nicht gespeichert werden.'); return false; }
}
const saveBackup = async how => { if (await saveFile('Wunschliste-Sicherung-' + TODAY() + '.json', JSON.stringify(state, null, 2), 'application/json', how)) setLastBackup(); };

async function copyFrom(id) {
  const ta = document.getElementById(id); if (!ta) return;
  try { await navigator.clipboard.writeText(ta.value); toast('Kopiert'); }
  catch (e) { ta.focus(); ta.select(); toast('Markiert – mit Strg/Cmd + C kopieren'); }
}
async function processImage(file) {
  if (!file || !/^image\//.test(file.type)) { toast('Bitte eine Bilddatei wählen.'); return; }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const sc = Math.min(1, 400 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * sc)); c.height = Math.max(1, Math.round(img.naturalHeight * sc));
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
    formImage = c.toDataURL('image/jpeg', 0.8);
    const dz = $('#img-drop'); if (dz) { dz.innerHTML = imgDropInner(); dz.classList.add('has'); }
    const rm = $('#img-rm'); if (rm) rm.hidden = false;
  } catch (e) { toast('Das Bild ließ sich nicht öffnen.'); }
  finally { URL.revokeObjectURL(url); }
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]'); if (!t) return;
  const a = t.dataset.a, id = t.dataset.id;
  switch (a) {
    case 'new': openEditor(null); break;
    case 'edit': openEditor(id); break;
    case 'deposit': openDeposit(id); break;
    case 'done': openDone(id); break;
    case 'share': openShare(); break;
    case 'export': openExport(); break;
    case 'settings': openSettings(); break;
    case 'close': closeDialog(); break;
    case 'retry': retried = false; dirty = true; setStatus('pending'); render(); scheduleSave(100); break;
    case 'tab': ui.tab = t.dataset.v; saveUi(); render(); break;
    case 'filter': ui.filter = t.dataset.v; saveUi(); render(); break;
    case 'gift': { const w = findWish(id); if (w) { w.gift = !w.gift; commit(); toast(w.gift ? 'Für andere sichtbar' : 'Nur noch für dich sichtbar'); } break; }
    case 'preview-on': sharePreview(); break;
    case 'preview-off': preview = false; viewData = null; render(); break;
    case 'share-link': if (shareUrl) shareLink(); break;
    case 'reload-update': applyUpdate(); break;
    case 'examples-remove': state.wishes = state.wishes.filter(w => !w.example); closeDialog(); commit(); toast('Beispiele entfernt'); break;
    case 'copy': copyFrom(t.dataset.target); break;
    case 'dl-md': saveFile('Wunschliste.md', markdown(), 'text/markdown'); break;
    case 'sh-md': saveFile('Wunschliste.md', markdown(), 'text/plain', 'share'); break;
    case 'dl-json': saveBackup(); break;
    case 'sh-json': saveBackup('share'); break;
    case 'shop-add': { const box = $('#shop-rows'); box.insertAdjacentHTML('beforeend', shopRow()); box.lastElementChild.querySelector('input').focus(); break; }
    case 'shop-del': { const row = t.closest('.shop-row'); const box = $('#shop-rows'); if (box.children.length > 1) row.remove(); else row.querySelectorAll('input').forEach(i => i.value = ''); break; }
    case 'img-remove': formImage = null; { const dz = $('#img-drop'); dz.innerHTML = imgDropInner(); dz.classList.remove('has'); t.hidden = true; } break;
    case 'calc-rate': calcRate(); break;
    case 'edit-del-ask': $('#del-zone').innerHTML = `<span class="confirm">Wirklich löschen? <button type="button" class="btn small danger solid" data-a="edit-del">Ja, löschen</button><button type="button" class="btn small" data-a="edit-del-cancel">Nein</button></span>`; break;
    case 'edit-del-cancel': $('#del-zone').innerHTML = `<button type="button" class="btn small ghost danger" data-a="edit-del-ask">${ic('trash')}Löschen</button>`; break;
    case 'edit-del': state.wishes = state.wishes.filter(w => w.id !== editId); closeDialog(); commit(); toast('Wunsch gelöscht'); break;
    case 'delete-ask': pendingDelete = id; render(); break;
    case 'delete-cancel': pendingDelete = null; render(); break;
    case 'delete': state.wishes = state.wishes.filter(w => w.id !== id); pendingDelete = null; commit(); toast('Wunsch gelöscht'); break;
    case 'reopen': { const w = findWish(id); if (w) { w.done = null; commit(); toast('Wieder auf der Liste'); } break; }
    case 'dep-del': { const w = findWish(id); if (w) { w.deposits = w.deposits.filter(d => d.id !== t.dataset.dep); commit(); openDeposit(id); } break; }
    case 'import-apply': if (importCandidate) { state = importCandidate; importCandidate = null; closeDialog(); commit(); toast('Sicherung geladen'); } break;
    case 'import-cancel': importCandidate = null; $('#import-zone').innerHTML = ''; break;
  }
});

document.addEventListener('keydown', e => {
  if (e.target.id === 'img-drop' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('#f-file').click(); }
});
document.addEventListener('click', e => { if (e.target.closest('#img-drop')) $('#f-file').click(); });

document.addEventListener('submit', e => {
  const f = e.target; e.preventDefault();
  if (f.id === 'f-wish') submitEditor();
  else if (f.id === 'f-dep') {
    const w = findWish($('#dlg-body').dataset.wid); const amt = parseNum($('#d-amt').value);
    if (!w || !amt) { toast('Gib einen Betrag ein.'); return; }
    w.deposits.push({ id: uid(), date: validDate($('#d-date').value) || TODAY(), amount: amt, note: str($('#d-note').value) });
    w.example = false; commit(); openDeposit(w.id); toast(amt > 0 ? eur(amt) + ' gebucht' : 'Entnahme gebucht');
  } else if (f.id === 'f-fix') {
    const w = findWish($('#dlg-body').dataset.wid); const amt = parseNum($('#x-amt').value);
    if (!w || amt == null) { toast('Gib den tatsächlichen Stand ein.'); return; }
    w.anchor = { date: TODAY(), amount: Math.max(0, amt) }; w.example = false; commit(); openDeposit(w.id); toast('Stand korrigiert');
  } else if (f.id === 'f-rate-q') {
    const w = findWish($('#dlg-body').dataset.wid); if (!w) return;
    w.rate = Math.max(0, parseNum($('#q-rate').value) || 0); w.start = validDate($('#q-start').value) || w.start; w.example = false;
    commit(); openDeposit(w.id); toast('Rate übernommen');
  } else if (f.id === 'f-done') {
    const w = findWish($('#dlg-body').dataset.wid); if (!w) return;
    const how = (f.querySelector('input[name=how]:checked') || {}).value === 'geschenkt' ? 'geschenkt' : 'gekauft';
    w.done = { how, date: validDate($('#dn-date').value) || TODAY(), from: how === 'geschenkt' ? str($('#dn-from').value) : '' };
    closeDialog(); commit(); toast('Glückwunsch! Unter „Erfüllt“ abgelegt.');
  } else if (f.id === 'f-settings') {
    state.owner = str($('#s-owner').value) || state.owner;
    state.budget = Math.max(0, parseNum($('#s-budget').value) || 0);
    { const pc = f.querySelector('input[name=theme]:checked'); if (pc) setTheme(pc.value); }
    closeDialog(); commit(); updateIdentity(); toast('Einstellungen gespeichert');
  }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'f-want') $('#o-want').textContent = t.value;
  else if (t.id === 'f-need') $('#o-need').textContent = t.value;
  else if (t.id === 'mood') { state.mood = +t.value; const m = $('#mood-t'); if (m) m.textContent = moodText() + ' Die Reihenfolge passt sich an.'; }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'theme') { applyTheme(t.value); }
  else if (t.id === 'mood') { state.mood = +t.value; commit(); }
  else if (t.id === 'f-sort') { ui.sort = t.value; saveUi(); render(); }
  else if (t.id === 'f-catsel') { ui.cat = t.value; saveUi(); render(); }
  else if (t.id === 'f-file') { if (t.files && t.files[0]) processImage(t.files[0]); t.value = ''; }
  else if (t.id === 's-import') {
    const file = t.files && t.files[0]; t.value = ''; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      let s = null; try { s = JSON.parse(r.result); } catch (err) {}
      if (!s || !Array.isArray(s.wishes)) { $('#import-zone').innerHTML = '<p class="confirm">Das ist keine gültige Sicherung.</p>'; return; }
      importCandidate = normalize(s);
      $('#import-zone').innerHTML = `<div class="confirm">Ersetzt deine ${state.wishes.length} Wünsche durch ${importCandidate.wishes.length} aus der Sicherung. <button type="button" class="btn small danger solid" data-a="import-apply">Ersetzen</button><button type="button" class="btn small" data-a="import-cancel">Abbrechen</button></div>`;
    };
    r.readAsText(file);
  }
});
dlg.addEventListener('paste', e => {
  if (!$('#img-drop')) return;
  const item = Array.from((e.clipboardData && e.clipboardData.items) || []).find(i => i.type && i.type.startsWith('image/'));
  if (item) { e.preventDefault(); processImage(item.getAsFile()); }
});
dlg.addEventListener('dragover', e => { const dz = e.target.closest && e.target.closest('#img-drop'); if (dz) { e.preventDefault(); dz.classList.add('over'); } });
dlg.addEventListener('dragleave', e => { const dz = e.target.closest && e.target.closest('#img-drop'); if (dz) dz.classList.remove('over'); });
dlg.addEventListener('drop', e => { const dz = e.target.closest && e.target.closest('#img-drop'); if (dz) { e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) processImage(f); } });

document.addEventListener('keydown', e => {
  const t = e.target.closest && e.target.closest('.tab');
  if (!t || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const ids = $$('.tab').map(b => b.dataset.v); let i = ids.indexOf(t.dataset.v);
  i = e.key === 'ArrowRight' ? (i + 1) % ids.length : e.key === 'ArrowLeft' ? (i - 1 + ids.length) % ids.length : e.key === 'Home' ? 0 : ids.length - 1;
  e.preventDefault(); ui.tab = ids[i]; saveUi(); render();
  const nb = document.getElementById('tab-' + ids[i]); if (nb) nb.focus();
});
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('.runhead nav a'); if (!a) return;
  e.preventDefault(); const el = document.getElementById((a.getAttribute('href') || '').slice(1)); if (el) el.scrollIntoView();
});

/* Matrix drag + keys */
let drag = null;
function svgPoint(svg, e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }
const toVal = (pos, a, b, inv) => clamp(Math.round(((inv ? b - pos : pos - a) / (b - a)) * 10 + 0.5), 1, 10);
document.addEventListener('pointerdown', e => {
  const g = e.target.closest && e.target.closest('#matrix .dot'); if (!g) return;
  const svg = $('#matrix'); const w = findWish(g.dataset.id); if (!w) return;
  e.preventDefault(); try { svg.setPointerCapture(e.pointerId); } catch (err) {}
  drag = { g, w, svg, want: w.want, need: w.need, moved: false }; g.classList.add('drag');
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = svgPoint(drag.svg, e);
  const x = clamp(p.x, MX.x0, MX.x1), y = clamp(p.y, MX.y0, MX.y1);
  drag.g.setAttribute('transform', `translate(${x} ${y})`);
  drag.want = toVal(x, MX.x0, MX.x1, false); drag.need = toVal(y, MX.y0, MX.y1, true); drag.moved = true;
});
function endDrag() {
  if (!drag) return;
  const { w, want, need, moved } = drag; drag.g.classList.remove('drag'); drag = null;
  if (moved && (w.want !== want || w.need !== need)) { w.want = want; w.need = need; w.example = false; commit(); }
  else if (moved) render();
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
document.addEventListener('keydown', e => {
  const g = e.target.closest && e.target.closest('#matrix .dot'); if (!g) return;
  const w = findWish(g.dataset.id); if (!w) return;
  const k = { ArrowRight: ['want', 1], ArrowLeft: ['want', -1], ArrowUp: ['need', 1], ArrowDown: ['need', -1] }[e.key];
  if (!k) return; e.preventDefault();
  const nv = clamp(w[k[0]] + k[1], 1, 10); if (nv === w[k[0]]) return;
  w[k[0]] = nv; commit();
});

 /* ---------- Teilen-Link, Update, Name ---------- */
async function shareLink() {
  const data = { title: possessive(state.owner) + ' Wunschliste', text: 'Meine Geschenkideen', url: shareUrl };
  if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  copyFrom('share-link');
}
async function applyUpdate() {
  if (mode === 'owner') await flushSave();
  if (updateReg && updateReg.waiting) updateReg.waiting.postMessage({ type: 'SKIP_WAITING' }); else location.reload();
}
function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloading) return; reloading = true; location.reload(); });
  navigator.serviceWorker.register('./sw.js').then(reg => {
    const offer = () => { updateReg = reg; render(); };
    if (reg.waiting && navigator.serviceWorker.controller) offer();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(); });
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
/* Name der installierten App aus den Einstellungen: Standard ist das statische Manifest, bei anderem Namen ein Blob-Manifest. */
let manifestOrig = null, manifestBlob = null;
function updateIdentity() {
  const name = possessive(state.owner) + ' Wunschliste';
  document.title = name;
  const mt = document.querySelector('meta[name="apple-mobile-web-app-title"]'); if (mt) mt.content = 'Wunschliste';
  const link = document.querySelector('link[rel="manifest"]'); if (!link) return;
  if (manifestOrig === null) manifestOrig = link.getAttribute('href');
  if (name === 'Annas Wunschliste') { link.setAttribute('href', manifestOrig); return; }
  fetch(manifestOrig).then(r => r.json()).then(m => {
    const abs = u => new URL(u, new URL(manifestOrig, location.href)).href;
    m.name = name; m.start_url = abs(m.start_url || './'); m.scope = abs(m.scope || './');
    m.icons = (m.icons || []).map(i => Object.assign({}, i, { src: abs(i.src) }));
    if (manifestBlob) URL.revokeObjectURL(manifestBlob);
    manifestBlob = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' }));
    link.setAttribute('href', manifestBlob);
  }).catch(() => {});
}

/* ---------- Boot ---------- */
window.addEventListener('hashchange', () => { if (isShared() || mode === 'viewer') location.reload(); });
let storageFail = false;
(async function boot() {
  if (isShared()) {
    // Ansicht für andere: berührt weder IndexedDB noch die eigenen Daten.
    try { viewData = await decodeToken(location.hash.slice(SHARE_PREFIX.length)); }
    catch (e) { viewError = e && e.message === 'no-decompress' ? 'Dieser Browser kann den Link nicht lesen. Bitte aktualisiere ihn.' : 'Dieser Link ist ungültig oder unvollständig.'; }
    render(); registerSW(); return;
  }
  try {
    const [st, lb] = await Promise.all([dbGet('state'), dbGet('lastBackup')]);
    if (st) state = normalize(st);
    lastBackup = validDate(lb);
  } catch (e) { storageFail = true; statusKey = 'error'; }
  render(); updateIdentity(); registerSW();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
})();
})();
