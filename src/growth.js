// 長歪判定：只吃資料、吐結果，不碰畫面。
// 強化次數直接用遊戲裡副詞條旁的黃色數字（sub.hits），不再從數值反推。

// 依等級推出來的強化次數 n＝目前等級 ÷ 3 取整數
export function upgradesSoFar(level, rules) {
  return Math.floor(level / rules.upgradeEvery);
}

// 剩餘強化次數
export function upgradesLeft(level, rarityKey, rules) {
  const max = rules.rarities[rarityKey].maxLevel;
  return Math.max(0, Math.floor((max - level) / rules.upgradeEvery));
}

// 好詞條＝對指定型別權重 ≥ goodWeight 的詞條
export function goodStatsFor(type, build, rules) {
  const w = rules.scoring.weights[build][type];
  return Object.keys(w).filter((k) => w[k] >= rules.growth.goodWeight);
}

// n＝等級推出來的強化次數；total＝黃色數字加總（含 0 級補償強化）
// 還沒升到 +3 一律算「還沒開始長」，0 級補償只是初始抽到的
export function growthLabel(n, total, goodHits, rules) {
  if (n === 0 || total === 0) return 'notStarted';
  const { greatRatio: g, badRatio: b } = rules.growth;
  if (goodHits * g.den >= total * g.num) return 'great';
  if (goodHits * b.den <= total * b.num) return 'bad';
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
  const rows = core.subs.map((sub) => ({ stat: sub.stat, good: good.has(sub.stat), hits: sub.hits }));
  const totalHits = rows.reduce((a, r) => a + r.hits, 0);
  const goodHits = rows.filter((r) => r.good).reduce((a, r) => a + r.hits, 0);
  const label = growthLabel(n, totalHits, goodHits, rules);

  const left = rules.rarities[core.rarity] ? upgradesLeft(core.level, core.rarity, rules) : 0;
  const goodRows = rows.filter((r) => r.good);
  const prob = rows.length > 0 ? goodRows.length / rows.length : 0;
  const goodLabels = goodRows.map((r) => rules.stats[r.stat].label);

  let forecast;
  if (left === 0) forecast = '已經升滿了，不會再長了';
  else if (goodRows.length === 0) forecast = `還能再長 ${left} 次，但現有副詞條都不是這個搭檔要的`;
  else forecast = `還能再長 ${left} 次，每次大約 ${Math.round(prob * 100)}% 會長在${joinOr(goodLabels)}上`;

  const premiumSeed = core.rarity === 'SSR' && rows.length === 2 && rows.every((r) => r.good);

  return {
    n,
    totalHits,
    bonusHits: Math.max(0, totalHits - n),
    goodHits,
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
