import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rules, companionsData } from './helpers.js';
import { gridsOf, subRatio, mainScore, scoreForType, scoreCompanions, bestOf, overallVerdict, dotColor } from '../src/scoring.js';

const base = (over = {}) => ({ slot: 'alpha', rarity: 'SSR', level: 0, main: 'hpFlat', build: 'crit', subs: [], ...over });

test('gridsOf：目前數值 ÷ 1 格', () => {
  assert.equal(gridsOf({ stat: 'critRate', current: 1.6 }, rules), 2);
  assert.equal(gridsOf({ stat: 'hpFlat', current: 1200 }, rules), 2);
  assert.equal(gridsOf({ stat: 'critRate', current: null }, rules), 0);
});

test('subRatio：全是暴擊暴傷＝1，全是沒用的＝0，沒副詞條＝0', () => {
  const good = [{ stat: 'critRate', current: 1.6 }, { stat: 'critDmg', current: 3.2 }];
  assert.equal(subRatio(good, 'def', 'crit', rules).ratio, 1);
  assert.equal(subRatio([{ stat: 'hpPct', current: 10 }], 'def', 'crit', rules).ratio, 0);
  assert.equal(subRatio([], 'atk', 'crit', rules).ratio, 0);
});

test('mainScore：β 加速回能 1.0、對應加成 0.8、不對應 0.2；α 不算', () => {
  assert.equal(mainScore('beta', 'energyRegen', 'atk', 'crit', rules), 1);
  assert.equal(mainScore('beta', 'defPct', 'def', 'crit', rules), 0.8);
  assert.equal(mainScore('beta', 'hpPct', 'def', 'crit', rules), 0.2);
  assert.equal(mainScore('alpha', 'hpFlat', 'atk', 'crit', rules), null);
});

test('mainScore：δ 虛弱流時虛弱增傷 1.0、暴擊流時 0.8', () => {
  assert.equal(mainScore('delta', 'weakDmg', 'atk', 'crit', rules), 0.8);
  assert.equal(mainScore('delta', 'weakDmg', 'atk', 'weak', rules), 1);
  assert.equal(mainScore('delta', 'critRate', 'atk', 'crit', rules), 1);
});

test('scoreForType：α 只看副詞條；紫 ×0.6；藍不算分', () => {
  const subs = [{ stat: 'critRate', current: 1.6 }, { stat: 'critDmg', current: 3.2 }];
  assert.equal(scoreForType(base({ subs }), 'atk', rules).score, 100);
  assert.equal(scoreForType(base({ subs, rarity: 'SR' }), 'atk', rules).score, 60);
  assert.equal(scoreForType(base({ subs, rarity: 'R' }), 'atk', rules).score, null);
});

test('scoreForType：虛弱流會讓暴擊芯核分數下降', () => {
  const subs = [{ stat: 'critRate', current: 1.6 }, { stat: 'critDmg', current: 3.2 }];
  assert.equal(scoreForType(base({ subs, build: 'weak' }), 'atk', rules).score, 30);
});

test('scoreCompanions：27 筆；待查的取最低分且不參加最佳評選', () => {
  const subs = [{ stat: 'hpPct', current: 10 }, { stat: 'critRate', current: 1.6 }];
  const scored = scoreCompanions(base({ subs }), companionsData.companions, rules);
  assert.equal(scored.length, 27);
  const unknown = scored.filter((s) => s.unknown);
  for (const u of unknown) assert.equal(u.result.type === 'hp', false);
  const best = bestOf(scored);
  assert.equal(best.type, 'hp');
  assert.ok(best.companions.every((c) => c.type === 'hp'));
});

test('overallVerdict：分數門檻與長歪降級', () => {
  const core = base();
  const mk = (score) => ({ score });
  assert.equal(overallVerdict(core, mk(80), 'great', rules).text, '留，升滿');
  assert.equal(overallVerdict(core, mk(80), 'bad', rules).text, '先留著');
  assert.equal(overallVerdict(core, mk(60), 'great', rules).text, '先留著');
  assert.equal(overallVerdict(core, mk(54), 'great', rules).text, '拆');
  assert.equal(overallVerdict(base({ rarity: 'R' }), null, 'great', rules).text, '拆');
});

test('gridsOf：誓約增傷查不到 1 格，用 2＋強化次數推估', () => {
  assert.equal(gridsOf({ stat: 'oathDmg', hits: 1, current: 1.4 }, rules), 3);
  assert.equal(gridsOf({ stat: 'oathDmg', hits: 0, current: 0.9 }, rules), 2);
});

test('scoreForType：截圖芯核（β 防禦加成）防禦型 57、攻擊型 40', async () => {
  const { screenshotCore } = await import('./helpers.js');
  assert.equal(scoreForType(screenshotCore(), 'def', rules).score, 57);
  assert.equal(scoreForType(screenshotCore(), 'atk', rules).score, 40);
});

test('dotColor：綠 ≥75、黃 55–74、灰 <55', () => {
  assert.equal(dotColor(75, rules), 'green');
  assert.equal(dotColor(74, rules), 'yellow');
  assert.equal(dotColor(54, rules), 'gray');
});
