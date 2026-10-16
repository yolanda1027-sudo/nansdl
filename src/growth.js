// 長歪判定：只吃資料、吐結果，不碰畫面。

// 已發生的強化次數 n＝目前等級 ÷ 3 取整數
export function upgradesSoFar(level, rules) {
  return Math.floor(level / rules.upgradeEvery);
}

// 剩餘強化次數
export function upgradesLeft(level, rarityKey, rules) {
  const max = rules.rarities[rarityKey].maxLevel;
  return Math.max(0, Math.floor((max - level) / rules.upgradeEvery));
}

// 每條副詞條被強化幾次。初始留空時用初始中間值推估。
export function subHits(sub, rules) {
  const r = rules.substats[sub.stat];
  if (!r || sub.current == null) return { hits: 0, estimated: false };
  if (sub.initial != null) {
    return { hits: Math.max(0, Math.round((sub.current - sub.initial) / r.mid)), estimated: false };
  }
  const initMid = (r.initMin + r.initMax) / 2;
  return { hits: Math.max(0, Math.round((sub.current - initMid) / r.mid)), estimated: true };
}

// 好詞條＝對指定型別權重 ≥ goodWeight 的詞條
export function goodStatsFor(type, build, rules) {
  const w = rules.scoring.weights[build][type];
  return Object.keys(w).filter((k) => w[k] >= rules.growth.goodWeight);
}

export function growthLabel(n, goodHits, rules) {
  if (n === 0) return 'notStarted';
  const { greatRatio: g, badRatio: b } = rules.growth;
  if (goodHits * g.den >= n * g.num) return 'great';
  if (goodHits * b.den <= n * b.num) return 'bad';
  return 'normal';
}

function joinOr(labels) {
  if (labels.length <= 1) return labels.join('');
  return labels.slice(0, -1).join('、') + '或' + labels[labels.length - 1];
}

// type＝分數最高那個搭檔的型別
export function analyzeGrowth(core, type, rules) {
  const n = upgradesSoFar(core.level, rules);
  const good = new Set(goodStatsFor(type, core.build, rules));
  const rows = core.subs.map((sub) => ({
    stat: sub.stat,
    good: good.has(sub.stat),
    ...subHits(sub, rules),
  }));
  const estimated = rows.some((r) => r.estimated);
  const totalHits = rows.reduce((a, r) => a + r.hits, 0);
  // 推估時可能把 0 級補償強化也算進去，好強化次數最多算到 n
  const goodHits = Math.min(n, rows.filter((r) => r.good).reduce((a, r) => a + r.hits, 0));
  const label = growthLabel(n, goodHits, rules);

  const left = rules.rarities[core.rarity] ? upgradesLeft(core.level, core.rarity, rules) : 0;
  const goodRows = rows.filter((r) => r.good);
  const prob = rows.length > 0 ? goodRows.length / rows.length : 0;
  const goodLabels = goodRows.map((r) => rules.stats[r.stat].label);

  let forecast;
  if (left === 0) forecast = '已經升滿了，不會再長了';
  else if (goodRows.length === 0) forecast = `還能再長 ${left} 次，但現有副詞條都不是這個搭檔要的`;
  else forecast = `還能再長 ${left} 次，每次大約 ${Math.round(prob * 100)}% 會長在${joinOr(goodLabels)}上`;

  const premiumSeed =
    core.rarity === 'SSR' && rows.length === 2 && rows.every((r) => r.good);

  return {
    n,
    totalHits,
    goodHits,
    estimated,
    label,
    labelText: rules.growth.labels[label].text,
    advice: rules.growth.labels[label].advice,
    rows,
    left,
    prob,
    forecast,
    premiumSeed,
  };
}
