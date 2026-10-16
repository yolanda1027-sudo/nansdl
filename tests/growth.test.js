import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rules, screenshotCore } from './helpers.js';
import { upgradesSoFar, upgradesLeft, goodStatsFor, growthLabel, analyzeGrowth, findConflicts } from '../src/growth.js';

const core = (over = {}) => ({ slot: 'alpha', rarity: 'SSR', level: 0, main: 'hpFlat', build: 'crit', subs: [], ...over });

test('upgradesSoFar／upgradesLeft', () => {
  assert.equal(upgradesSoFar(0, rules), 0);
  assert.equal(upgradesSoFar(8, rules), 2);
  assert.equal(upgradesSoFar(15, rules), 5);
  assert.equal(upgradesLeft(9, 'SSR', rules), 2);
  assert.equal(upgradesLeft(12, 'SR', rules), 0);
});

test('goodStatsFor：防禦型暴擊流＝暴擊、暴傷、防禦加成；誓約增傷不算好詞條', () => {
  assert.deepEqual(goodStatsFor('def', 'crit', rules).sort(), ['critDmg', 'critRate', 'defPct']);
  assert.deepEqual(goodStatsFor('atk', 'weak', rules).sort(), ['atkPct', 'weakDmg']);
});

test('growthLabel：四種標籤（分母是黃色數字加總）', () => {
  assert.equal(growthLabel(0, 1, 0, rules), 'notStarted');
  assert.equal(growthLabel(3, 3, 2, rules), 'great');
  assert.equal(growthLabel(3, 3, 1, rules), 'bad');
  assert.equal(growthLabel(5, 5, 2, rules), 'normal');
  assert.equal(growthLabel(1, 2, 1, rules), 'normal');
});

test('analyzeGrowth：長歪＋預估句子', () => {
  const g = analyzeGrowth(core({
    level: 9,
    subs: [
      { stat: 'critRate', hits: 0, current: 1.2 },
      { stat: 'defFlat', hits: 3, current: 57.5 },
      { stat: 'hpPct', hits: 0, current: 7 },
      { stat: 'critDmg', hits: 0, current: 2.5 },
    ],
  }), 'atk', rules);
  assert.equal(g.totalHits, 3);
  assert.equal(g.goodHits, 0);
  assert.equal(g.label, 'bad');
  assert.equal(g.forecast, '還能再長 2 次，每次大約 50% 會長在暴擊或暴傷上');
});

test('analyzeGrowth：天生 2 條都是好詞條＝極品胚子；0 級補償算進 bonusHits', () => {
  const g = analyzeGrowth(core({ subs: [{ stat: 'critRate', hits: 1, current: 2.2 }, { stat: 'critDmg', hits: 1, current: 4.4 }] }), 'hp', rules);
  assert.equal(g.premiumSeed, true);
  assert.equal(g.label, 'notStarted');
  assert.equal(g.bonusHits, 2);
});

test('analyzeGrowth：截圖芯核 +0 還沒開始長，還能長 5 次', () => {
  const g = analyzeGrowth(screenshotCore(), 'def', rules);
  assert.equal(g.label, 'notStarted');
  assert.equal(g.totalHits, 1);
  assert.equal(g.left, 5);
});

const conflictCore = (over = {}) => core({
  slot: 'delta', main: 'critRate',
  subs: [
    { stat: 'critRate', hits: 0, current: 1.4 },
    { stat: 'critDmg', hits: 0, current: 2.8 },
    { stat: 'hpPct', hits: 0, current: 9 },
    { stat: 'defPct', hits: 0, current: 9 },
  ],
  ...over,
});

test('findConflicts：生命加成＋防禦加成＝衝突；給防禦型時生命加成白升 25%', () => {
  const [c] = findConflicts(conflictCore(), 'def', rules);
  assert.deepEqual(c.wasted, ['hpPct']);
  assert.equal(c.prob, 0.25);
  assert.equal(c.left, 5);
  assert.equal(c.expectedWasted, 1.25);
});

test('findConflicts：給攻擊型時兩條都白升；生命固定值＋防禦加成也算衝突', () => {
  assert.deepEqual(findConflicts(conflictCore(), 'atk', rules)[0].wasted.sort(), ['defPct', 'hpPct']);
  const mixed = core({ subs: [{ stat: 'hpFlat', hits: 0, current: 900 }, { stat: 'defPct', hits: 0, current: 8 }] });
  assert.equal(findConflicts(mixed, 'def', rules).length, 1);
});

test('findConflicts：沒有衝突回空陣列', () => {
  const ok = core({ subs: [{ stat: 'hpPct', hits: 0, current: 9 }, { stat: 'atkPct', hits: 0, current: 9 }] });
  assert.deepEqual(findConflicts(ok, 'hp', rules), []);
});
