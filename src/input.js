// 輸入區畫面：建立表單、把畫面狀態轉成 core、依驗證結果標紅。

const SUB_ROWS = 4;

function urchinPoints() {
  const pts = [];
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * 2 * i) / 24 - Math.PI / 2;
    const r = i % 2 === 0 ? 11 : 6.5;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

const SLOT_SHAPES = {
  alpha: '<polygon points="12,2 20,12 12,22 4,12"/>',
  beta: '<rect x="4" y="4" width="16" height="16" rx="3.5"/>',
  gamma: `<polygon points="${urchinPoints()}"/>`,
  delta: '<polygon points="12,3.5 21,19.5 3,19.5" stroke-linejoin="round" stroke-width="2.5"/>',
};

const STELLA_TOKENS = ['--st-1', '--st-2', '--st-3', '--st-4', '--st-5', '--st-6'];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function emptyState(build) {
  return {
    slot: null,
    rarity: 'SSR',
    stellactrum: null,
    level: 0,
    main: null,
    build: build || 'crit',
    subs: Array.from({ length: SUB_ROWS }, () => ({ stat: '', initial: '', current: '' })),
    isExample: false,
  };
}

// 規格書的範例芯核，讓頁面一打開就有結果可看
export function exampleState() {
  return {
    slot: 'delta',
    rarity: 'SSR',
    stellactrum: '粉珀',
    level: 9,
    main: 'critRate',
    build: 'crit',
    subs: [
      { stat: 'critDmg', initial: '2.5', current: '5.2' },
      { stat: 'atkPct', initial: '8', current: '8' },
      { stat: 'critRate', initial: '1.2', current: '2.0' },
      { stat: 'hpFlat', initial: '900', current: '900' },
    ],
    isExample: true,
  };
}

function toNum(s) {
  if (s === '' || s == null) return null;
  const n = parseFloat(String(s).replace(/[%,，\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function stateToCore(state) {
  return {
    slot: state.slot,
    rarity: state.rarity,
    stellactrum: state.stellactrum,
    level: state.level,
    main: state.main,
    build: state.build,
    subs: state.subs.map((s) => ({ stat: s.stat, initial: toNum(s.initial), current: toNum(s.current) })),
  };
}

export function buildInputForm(root, rules) {
  const slotBtns = Object.entries(rules.slots)
    .map(([k, s]) => `
      <button type="button" class="slot-btn" id="slot-${k}" data-slot="${k}" role="radio" aria-checked="false">
        <svg viewBox="0 0 24 24" aria-hidden="true">${SLOT_SHAPES[k]}</svg>
        <span class="slot-sym">${esc(s.symbol)}</span>
        <span class="slot-nick">${esc(s.nick)}</span>
      </button>`)
    .join('');

  const rarityBtns = Object.entries(rules.rarities)
    .map(([k, r]) => `
      <button type="button" class="rar-btn rar-${k}" id="rar-${k}" data-rarity="${k}" role="radio" aria-checked="false">
        <span class="rar-swatch"></span>${esc(r.label)}
      </button>`)
    .join('');

  const stellaBtns = rules.stellactra
    .map((name, i) => `
      <button type="button" class="st-btn" id="st-${i}" data-st="${esc(name)}" aria-pressed="false" style="--dot: var(${STELLA_TOKENS[i]})">
        <span class="st-dot"></span><span class="st-name">${esc(name)}</span>
      </button>`)
    .join('');

  const subRows = Array.from({ length: SUB_ROWS }, (_, i) => `
      <div class="sub-row" data-row="${i}">
        <select id="sub-stat-${i}" aria-label="第 ${i + 1} 條副詞條"></select>
        <input id="sub-init-${i}" inputmode="decimal" autocomplete="off" aria-label="第 ${i + 1} 條初始數值">
        <input id="sub-cur-${i}" inputmode="decimal" autocomplete="off" aria-label="第 ${i + 1} 條目前數值">
      </div>
      <div class="sub-msg" id="sub-msg-${i}" hidden></div>`)
    .join('');

  root.innerHTML = `
    <div class="example-note" id="example-note" hidden>
      目前填的是規格書的範例芯核，按底部「清空重填」就能換成你的。
    </div>
    <div class="field">
      <div class="label" id="lbl-slot">槽位</div>
      <div class="slots" role="radiogroup" aria-labelledby="lbl-slot">${slotBtns}</div>
      <div class="field-msg" id="msg-slot" hidden></div>
    </div>
    <div class="field">
      <div class="label" id="lbl-rar">稀有度</div>
      <div class="rarities" role="radiogroup" aria-labelledby="lbl-rar">${rarityBtns}</div>
      <div class="field-msg" id="msg-rarity" hidden></div>
    </div>
    <div class="field">
      <div class="label">星譜 <span class="opt">選填，只決定能裝哪張卡</span></div>
      <div class="stellas">${stellaBtns}</div>
    </div>
    <div class="field">
      <div class="label" id="lbl-lv">目前等級</div>
      <div class="stepper" aria-labelledby="lbl-lv">
        <button type="button" class="step-btn" id="lv-minus" aria-label="等級減一">−</button>
        <output class="lv-val" id="lv-val" aria-live="polite">+0</output>
        <button type="button" class="step-btn" id="lv-plus" aria-label="等級加一">＋</button>
        <span class="lv-note" id="lv-note"></span>
      </div>
      <div class="field-msg" id="msg-level" hidden></div>
    </div>
    <div class="field">
      <label class="label" for="main-stat">主詞條</label>
      <select id="main-stat"></select>
      <div class="main-fixed" id="main-fixed" hidden></div>
      <div class="field-msg" id="msg-main" hidden></div>
    </div>
    <div class="field">
      <div class="label">副詞條 <span class="opt">初始＝0 級時的數值，沒記下來可以留空</span></div>
      <div class="subs-head" aria-hidden="true"><span>詞條</span><span>初始</span><span>目前</span></div>
      ${subRows}
      <div class="field-msg" id="msg-subs" hidden></div>
    </div>`;
}

function setRadio(root, selector, attr, value) {
  root.querySelectorAll(selector).forEach((b) => {
    const on = b.dataset[attr] === value;
    b.classList.toggle('on', on);
    if (b.hasAttribute('aria-checked')) b.setAttribute('aria-checked', String(on));
    if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(on));
  });
}

function fillSelect(sel, options, value, rules, placeholder) {
  const html = [`<option value="">${placeholder}</option>`]
    .concat(options.map((k) => `<option value="${k}">${esc(rules.stats[k].label)}</option>`))
    .join('');
  if (sel.dataset.opts !== options.join(',')) {
    sel.innerHTML = html;
    sel.dataset.opts = options.join(',');
  }
  sel.value = value || '';
}

function showMsg(el, text) {
  el.hidden = !text;
  el.textContent = text || '';
}

// 依目前狀態更新畫面；showErrors＝按過「檢查」才顯示必填錯誤
export function syncInputUI(root, state, rules, check, showErrors) {
  root.querySelector('#example-note').hidden = !state.isExample;
  setRadio(root, '.slot-btn', 'slot', state.slot);
  setRadio(root, '.rar-btn', 'rarity', state.rarity);
  setRadio(root, '.st-btn', 'st', state.stellactrum);

  const rarity = rules.rarities[state.rarity];
  const max = rarity ? rarity.maxLevel : 15;
  root.querySelector('#lv-val').textContent = `+${state.level}`;
  root.querySelector('#lv-minus').disabled = state.level <= 0;
  root.querySelector('#lv-plus').disabled = state.level >= max;
  const n = Math.floor(state.level / rules.upgradeEvery);
  root.querySelector('#lv-note').textContent = `已強化 ${n} 次 · 上限 +${max}`;

  const slot = rules.slots[state.slot];
  const mainSel = root.querySelector('#main-stat');
  const mainFixed = root.querySelector('#main-fixed');
  if (slot && slot.mainFixed) {
    mainSel.hidden = true;
    mainFixed.hidden = false;
    mainFixed.textContent = `${rules.stats[slot.mainFixed].label}（${slot.symbol} 槽固定）`;
  } else {
    mainSel.hidden = false;
    mainFixed.hidden = true;
    mainSel.disabled = !slot;
    fillSelect(mainSel, slot ? slot.mainOptions : [], state.main, rules, slot ? '選一個主詞條' : '先選槽位');
  }

  const errs = showErrors ? check.errors : [];
  const fieldErr = (f) => errs.find((e) => e.field === f && e.row == null);
  showMsg(root.querySelector('#msg-slot'), fieldErr('slot')?.msg);
  showMsg(root.querySelector('#msg-rarity'), fieldErr('rarity')?.msg);
  showMsg(root.querySelector('#msg-level'), fieldErr('level')?.msg);
  showMsg(root.querySelector('#msg-main'), fieldErr('main')?.msg);
  showMsg(root.querySelector('#msg-subs'), fieldErr('subs')?.msg);
  mainSel.classList.toggle('bad', !!fieldErr('main'));

  // check.core.subs 會拿掉空白列，所以要把畫面列號對回去
  const rowMap = [];
  state.subs.forEach((s, i) => { if (s.stat) rowMap.push(i); });

  state.subs.forEach((sub, i) => {
    const sel = root.querySelector(`#sub-stat-${i}`);
    fillSelect(sel, rules.subOptions, sub.stat, rules, '—');
    const init = root.querySelector(`#sub-init-${i}`);
    const cur = root.querySelector(`#sub-cur-${i}`);
    if (document.activeElement !== init) init.value = sub.initial;
    if (document.activeElement !== cur) cur.value = sub.current;
    const r = rules.substats[sub.stat];
    const unit = sub.stat ? rules.stats[sub.stat].unit : '';
    init.placeholder = r ? `${r.initMin}–${r.initMax}${unit}` : '選填';
    cur.placeholder = r ? `最多 ${r.cap}${unit}` : '';
    init.disabled = cur.disabled = !sub.stat;
    [sel, init, cur].forEach((el) => el.classList.remove('bad', 'flag'));

    const coreRow = rowMap.indexOf(i);
    const msgs = [];
    if (coreRow >= 0) {
      const own = (list) => list.filter((e) => e.row === coreRow);
      for (const e of own(errs)) {
        msgs.push({ kind: 'bad', text: e.msg });
        (e.field === 'current' ? cur : sel).classList.add('bad');
      }
      for (const w of own(check.warnings)) {
        msgs.push({ kind: 'bad', text: w.msg });
        ({ initial: init, current: cur, stat: sel })[w.field]?.classList.add('bad');
      }
      for (const f of own(check.flags)) {
        msgs.push({ kind: 'flag', text: `${f.msg}，不是打錯` });
        init.classList.add('flag');
      }
    }
    const box = root.querySelector(`#sub-msg-${i}`);
    box.hidden = msgs.length === 0;
    box.innerHTML = msgs.map((m) => `<span class="m-${m.kind}">${esc(m.text)}</span>`).join('');
  });
}
