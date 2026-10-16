// 適配分數與總結論：只吃資料、吐結果，不碰畫面。

export const TYPES = ['atk', 'def', 'hp'];

// 步驟 1：副詞條換算成格數
export function gridsOf(sub, rules) {
  const r = rules.substats[sub.stat];
  if (!r || sub.current == null) return 0;
  return sub.current / r.grid;
}

// 步驟 2＋4 前半：副詞條比＝Σ(格數×權重)／Σ格數
export function subRatio(subs, type, build, rules) {
  const w = rules.scoring.weights[build][type];
  let sumGrid = 0;
  let sumWeighted = 0;
  const rows = subs.map((sub) => {
    const grids = gridsOf(sub, rules);
    const weight = w[sub.stat] ?? 0;
    sumGrid += grids;
    sumWeighted += grids * weight;
    return { stat: sub.stat, grids, weight, weighted: grids * weight };
  });
  return { ratio: sumGrid > 0 ? sumWeighted / sumGrid : 0, rows, sumGrid, sumWeighted };
}

// 步驟 3：主詞條分數（只算 β、δ；α、γ 回傳 null）
export function mainScore(slot, main, type, build, rules) {
  const table = rules.scoring.main[slot];
  if (!table) return null;
  const t = table[build];
  if (main in t.fixed) return t.fixed[main];
  if (main === rules.scoring.typePct[type]) return t.typedPct;
  if (Object.values(rules.scoring.typePct).includes(main)) return t.otherPct;
  return 0;
}

// 單一型別的適配分（已乘上稀有度倍率；藍 R 回傳 null）
export function scoreForType(core, type, rules) {
  const rarity = rules.rarities[core.rarity];
  const sub = subRatio(core.subs, type, core.build, rules);
  const main = mainScore(core.slot, core.main, type, core.build, rules);
  const { mainShare, subShare } = rules.scoring;
  const base = main == null ? 100 * sub.ratio : 100 * (mainShare * main + subShare * sub.ratio);
  const raw = rarity && rarity.scored ? base * rarity.scoreMultiplier : null;
  return {
    type,
    raw,
    score: raw == null ? null : Math.round(raw),
    main,
    ratio: sub.ratio,
    rows: sub.rows,
  };
}

export function scoreAllTypes(core, rules) {
  const out = {};
  for (const t of TYPES) out[t] = scoreForType(core, t, rules);
  return out;
}

// 每個搭檔一筆；型別待查的取三型最低分，並標 unknown
export function scoreCompanions(core, companions, rules) {
  const byType = scoreAllTypes(core, rules);
  return companions.map((c) => {
    if (TYPES.includes(c.type)) {
      return { companion: c, unknown: false, result: byType[c.type] };
    }
    const pick = TYPES.map((t) => byType[t]).reduce((lo, r) => (r.raw ?? -1) < (lo.raw ?? -1) ? r : lo);
    return { companion: c, unknown: true, result: pick };
  });
}

// 找出最適合的搭檔（只看型別已知的）
export function bestOf(scored) {
  const known = scored.filter((s) => !s.unknown && s.result.score != null);
  if (known.length === 0) return null;
  const top = Math.max(...known.map((s) => s.result.raw));
  const ties = known.filter((s) => s.result.raw === top);
  return { score: Math.round(top), type: ties[0].companion.type, companions: ties.map((s) => s.companion), result: ties[0].result };
}

export function dotColor(score, rules) {
  if (score == null) return 'gray';
  if (score >= rules.dots.greenMin) return 'green';
  if (score >= rules.dots.yellowMin) return 'yellow';
  return 'gray';
}

// 總結論：只看最高分＋長歪標籤
// growthLabel 是 growth.js 的 label key（notStarted／great／normal／bad）
export function overallVerdict(core, best, growthLabel, rules) {
  const v = rules.verdict;
  const rarity = rules.rarities[core.rarity];
  if (!rarity || !rarity.scored || !best) {
    return { key: 'scrap', text: v.texts.scrap, reason: 'rarity' };
  }
  const s = best.score;
  if (s >= v.keepMin && growthLabel !== 'bad') return { key: 'keep', text: v.texts.keep, reason: 'score' };
  if (s >= v.keepMin) return { key: 'hold', text: v.texts.hold, reason: 'grewBadly' };
  if (s >= v.holdMin) return { key: 'hold', text: v.texts.hold, reason: 'score' };
  return { key: 'scrap', text: v.texts.scrap, reason: 'score' };
}
