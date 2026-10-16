// 把資料、計算模組和畫面接起來。打包時會和其他 src 檔案合成一支 script。
import { validateCore } from './validate.js';
import { scoreCompanions, bestOf, overallVerdict, dotColor } from './scoring.js';
import { analyzeGrowth } from './growth.js';
import { esc, emptyState, exampleState, stateToCore, buildInputForm, syncInputUI } from './input.js';
import { renderResult } from './result.js';

export function computeModel(core, rules, data) {
  const v = validateCore(core, rules);
  if (!v.ok) return { validation: v };
  const c = v.core;
  const rarity = rules.rarities[c.rarity];
  if (!rarity.scored) {
    return { validation: v, core: c, verdict: overallVerdict(c, null, null, rules) };
  }
  const scored = scoreCompanions(c, data.companions, rules);
  const best = bestOf(scored);
  const growth = analyzeGrowth(c, best.type, rules);
  const verdict = overallVerdict(c, best, growth.label, rules);
  return { validation: v, core: c, scored, best, growth, verdict, dot: (s) => dotColor(s, rules) };
}

const FILTER_KEY = 'protocore-fit:leads';
const BUILD_KEY = 'protocore-fit:build';

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 無痕模式之類的，忽略 */ }
}
function loadBuild() {
  try { return JSON.parse(localStorage.getItem(BUILD_KEY)) === 'weak' ? 'weak' : 'crit'; } catch { return 'crit'; }
}

export function boot() {
  const rules = JSON.parse(document.getElementById('rules-data').textContent);
  const data = JSON.parse(document.getElementById('companions-data').textContent);
  const form = document.getElementById('form');
  const out = document.getElementById('result');
  const empty = document.getElementById('result-empty');

  let state = emptyState();
  state.build = loadBuild();
  let showErrors = false;
  const filter = loadSet(FILTER_KEY);

  buildInputForm(form, rules);

  function sync() {
    const check = validateCore(stateToCore(state), rules);
    syncInputUI(form, state, rules, check, showErrors);
    document.querySelectorAll('.build-btn').forEach((b) => {
      const on = b.dataset.build === state.build;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    return check;
  }

  let lastModel = null;
  function run(scroll) {
    showErrors = true;
    const check = sync();
    const model = computeModel(stateToCore(state), rules, data);
    const errBox = document.getElementById('form-errors');
    if (!check.ok) {
      errBox.hidden = false;
      errBox.textContent = `還差一點：${[...new Set(check.errors.map((e) => e.msg))].join('、')}`;
      if (scroll) errBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    errBox.hidden = true;
    lastModel = model;
    empty.hidden = true;
    renderResult(out, model, rules, data, filter, esc);
    if (scroll) out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function edited() {
    state.isExample = false;
    sync();
  }

  form.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.slot) {
      state.slot = t.dataset.slot;
      const slot = rules.slots[state.slot];
      if (slot.mainFixed) state.main = slot.mainFixed;
      else if (!slot.mainOptions.includes(state.main)) state.main = null;
    } else if (t.dataset.rarity) {
      state.rarity = t.dataset.rarity;
      state.level = Math.min(state.level, rules.rarities[state.rarity].maxLevel);
    } else if (t.dataset.st) {
      state.stellactrum = state.stellactrum === t.dataset.st ? null : t.dataset.st;
    } else if (t.id === 'lv-minus') {
      state.level = Math.max(0, state.level - 1);
    } else if (t.id === 'lv-plus') {
      state.level = Math.min(rules.rarities[state.rarity].maxLevel, state.level + 1);
    } else return;
    edited();
  });

  form.addEventListener('change', (e) => {
    const id = e.target.id;
    if (id === 'main-stat') state.main = e.target.value || null;
    const h = id.match(/^sub-hits-(\d)$/);
    if (h) state.subs[+h[1]].hits = parseInt(e.target.value, 10) || 0;
    const m = id.match(/^sub-stat-(\d)$/);
    if (m) {
      const row = state.subs[+m[1]];
      row.stat = e.target.value;
      if (!row.stat) { row.hits = 0; row.current = ''; }
    }
    edited();
  });

  form.addEventListener('input', (e) => {
    const m = e.target.id.match(/^sub-cur-(\d)$/);
    if (!m) return;
    state.subs[+m[1]].current = e.target.value;
    state.isExample = false;
  });
  form.addEventListener('focusout', (e) => {
    if (/^sub-cur-\d$/.test(e.target.id)) sync();
  });

  document.querySelectorAll('.build-btn').forEach((b) =>
    b.addEventListener('click', () => {
      state.build = b.dataset.build;
      save(BUILD_KEY, state.build);
      sync();
      if (lastModel) run(false);
    }));

  document.getElementById('btn-check').addEventListener('click', () => run(true));
  document.getElementById('btn-reset').addEventListener('click', () => {
    state = emptyState(state.build);
    showErrors = false;
    lastModel = null;
    document.getElementById('form-errors').hidden = true;
    out.innerHTML = '';
    empty.hidden = false;
    sync();
    window.scrollTo({ top: 0, behavior: 'auto' });
  });

  out.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const id = chip.dataset.lead;
    if (!id) filter.clear();
    else if (filter.has(id)) filter.delete(id);
    else filter.add(id);
    if (filter.size === data.leads.length) filter.clear();
    save(FILTER_KEY, [...filter]);
    renderResult(out, lastModel, rules, data, filter, esc);
  });

  document.getElementById('btn-example').addEventListener('click', () => {
    state = exampleState();
    state.build = loadBuild();
    sync();
    run(true);
  });

  sync();
}
