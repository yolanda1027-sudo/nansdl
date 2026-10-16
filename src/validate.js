// 輸入驗證：只吃資料、吐結果，不碰畫面。
// core 形狀：
// { slot, rarity, stellactrum, level, main, build, subs: [{ stat, hits, current }] }
// hits＝遊戲裡副詞條旁的黃色數字（被強化幾次，含 0 級補償強化；沒有數字就是 0）

const OUT_OF_RANGE = '這個數值不太可能出現，要不要再看一次？';

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// 把空白列拿掉，α／γ 自動帶主詞條
export function normalizeCore(core, rules) {
  const slot = rules.slots[core.slot];
  const main = slot && slot.mainFixed ? slot.mainFixed : core.main || null;
  const subs = (core.subs || [])
    .filter((s) => s && s.stat)
    .map((s) => ({
      stat: s.stat,
      hits: Number.isInteger(s.hits) && s.hits > 0 ? s.hits : 0,
      current: isNum(s.current) ? s.current : null,
    }));
  return {
    slot: core.slot || null,
    rarity: core.rarity || null,
    stellactrum: core.stellactrum || null,
    level: isNum(core.level) ? core.level : 0,
    main,
    build: core.build === 'weak' ? 'weak' : 'crit',
    subs,
  };
}

// 依強化次數推算這條副詞條「合理的數值範圍」；查不到範圍的詞條回傳 null
export function plausibleRange(stat, hits, rules) {
  const r = rules.substats[stat];
  if (!r || r.initMin == null) return null;
  // 不套 cap：cap 是用最多強化 5 次算的，天生 2 條的芯核單條可以被強化到 7 次
  return {
    min: r.initMin + hits * r.stepMin,
    max: r.initMax + hits * r.stepMax,
  };
}

// 單一副詞條數值檢查（只有 SSR 有範圍資料）：'ok'｜'out'｜'unknown'
export function checkSubValue(sub, rarity, rules) {
  if (rarity !== 'SSR' || sub.current == null) return 'ok';
  const range = plausibleRange(sub.stat, sub.hits, rules);
  if (!range) return 'unknown';
  const eps = 1e-9;
  return sub.current < range.min - eps || sub.current > range.max + eps ? 'out' : 'ok';
}

export function validateCore(rawCore, rules) {
  const core = normalizeCore(rawCore, rules);
  const errors = [];
  const warnings = [];

  const slot = rules.slots[core.slot];
  if (!slot) errors.push({ field: 'slot', msg: '先選一個槽位' });

  const rarity = rules.rarities[core.rarity];
  if (!rarity) errors.push({ field: 'rarity', msg: '先選稀有度' });

  if (rarity && (core.level < 0 || core.level > rarity.maxLevel || !Number.isInteger(core.level))) {
    errors.push({ field: 'level', msg: `等級要在 0 到 ${rarity.maxLevel} 之間` });
  }

  if (slot && !slot.mainFixed) {
    if (!core.main) errors.push({ field: 'main', msg: '這個槽位要選主詞條' });
    else if (!slot.mainOptions.includes(core.main)) {
      errors.push({ field: 'main', msg: '這個主詞條不會出現在這個槽位' });
    }
  }

  if (core.subs.length === 0) {
    errors.push({ field: 'subs', msg: '至少填一條副詞條' });
  }
  if (core.subs.length > rules.maxSubstats) {
    errors.push({ field: 'subs', msg: `副詞條最多 ${rules.maxSubstats} 條` });
  }

  const seen = new Set();
  core.subs.forEach((sub, row) => {
    if (!rules.subOptions.includes(sub.stat)) {
      errors.push({ field: 'subs', row, msg: '不認得這個副詞條' });
      return;
    }
    if (seen.has(sub.stat)) errors.push({ field: 'subs', row, msg: '副詞條不能重複' });
    seen.add(sub.stat);
    // 規格書說不能重複，但範例芯核（主詞條暴擊＋副詞條暴擊）本身就重複，先只提醒不擋
    if (core.main && sub.stat === core.main) {
      warnings.push({ field: 'stat', row, msg: '副詞條和主詞條一樣，要不要再看一次？' });
    }
    if (sub.hits > rules.maxHitsPerSub) {
      errors.push({ field: 'hits', row, msg: `強化次數最多 ${rules.maxHitsPerSub}` });
    }
    if (sub.current == null) {
      errors.push({ field: 'current', row, msg: '要填目前數值' });
    }
    if (checkSubValue(sub, core.rarity, rules) === 'out') {
      warnings.push({ field: 'current', row, msg: OUT_OF_RANGE });
    }
  });

  // 強化次數加總應該≈等級推出來的次數（多出來的是 0 級補償，最多 2 次；
  // 天生 3 條的芯核 +3 可能是新增第 4 條，所以可以少 1 次）
  if (rarity && core.subs.length > 0) {
    const n = Math.floor(core.level / rules.upgradeEvery);
    const total = core.subs.reduce((a, s) => a + s.hits, 0);
    if (total > n + 2 || total < n - 1) {
      warnings.push({ field: 'hits', msg: `黃色數字加起來是 ${total}，+${core.level} 通常是 ${Math.max(0, n - 1)}～${n + 2}，要不要再看一次？` });
    }
  }

  return { ok: errors.length === 0, core, errors, warnings };
}
