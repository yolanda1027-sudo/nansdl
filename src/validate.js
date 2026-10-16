// 輸入驗證：只吃資料、吐結果，不碰畫面。
// core 形狀：
// { slot, rarity, stellactrum, level, main, build, subs: [{ stat, initial, current }] }
// initial 可以是 null（沒記下來）；current 必填。

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
      initial: isNum(s.initial) ? s.initial : null,
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

// 單一副詞條數值檢查（只有 SSR 有範圍資料）
// 回傳 { initial: 'ok'|'compensated'|'out', current: 'ok'|'out' }
export function checkSubValue(sub, rarity, rules) {
  const r = rules.substats[sub.stat];
  const res = { initial: 'ok', current: 'ok' };
  if (rarity !== 'SSR' || !r) return res;
  if (sub.initial != null) {
    if (sub.initial < r.initMin || sub.initial > r.cap) res.initial = 'out';
    else if (sub.initial > r.initMax) res.initial = 'compensated';
  }
  if (sub.current != null) {
    if (sub.current < r.initMin || sub.current > r.cap) res.current = 'out';
    else if (sub.initial != null && sub.current < sub.initial) res.current = 'out';
  }
  return res;
}

export function validateCore(rawCore, rules) {
  const core = normalizeCore(rawCore, rules);
  const errors = [];
  const warnings = [];
  const flags = [];

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
    if (sub.current == null) {
      errors.push({ field: 'current', row, msg: '要填目前數值' });
    }
    const check = checkSubValue(sub, core.rarity, rules);
    if (check.initial === 'out') warnings.push({ field: 'initial', row, msg: OUT_OF_RANGE });
    if (check.initial === 'compensated') {
      flags.push({ row, kind: 'compensated', msg: '含 0 級補償強化' });
    }
    if (check.current === 'out') warnings.push({ field: 'current', row, msg: OUT_OF_RANGE });
  });

  return { ok: errors.length === 0, core, errors, warnings, flags };
}
