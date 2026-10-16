import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rules } from './helpers.js';
import { upgradesSoFar, upgradesLeft, subHits, goodStatsFor, growthLabel, analyzeGrowth } from '../src/growth.js';

const core = (over = {}) => ({ slot: 'alpha', rarity: 'SSR', level: 0, main: 'hpFlat', build: 'crit', subs: [], ...over });

test('upgradesSoFar／upgradesLeft', () => {
  assert.equal(upgradesSoFar(0, rules), 0);
  assert.equal(upgradesSoFar(8, rules), 2);
  assert.equal(upgradesSoFar(15, rules), 5);
  assert.equal(upgradesLeft(9, 'SSR', rules), 2);
  assert.equal(upgradesLeft(12, 'SR', rules), 0);
});

test('subHits：有初始值直接比；留空用初始中間值推估', () => {
  assert.deepEqual(subHits({ stat: 'critDmg', initial: 2.5, current: 5.2 }, rules), { hits: 2, estimated: false });
  assert.deepEqual(subHits({ stat: 'critRate', initial: null, current: 2.7 }, rules), { hits: 2, estimated: true });
  assert.deepEqual(subHits({ stat: 'atkPct', initial: null, current: 7 }, rules), { hits: 0, estimated: true });
});

test('goodStatsFor：防禦型暴擊流＝暴擊、暴傷、防禦加成', () => {
  assert.deepEqual(goodStatsFor('def', 'crit', rules).sort(), ['critDmg', 'critRate', 'defPct']);
  assert.deepEqual(goodStatsFor('atk', 'weak', rules).sort(), ['atkPct', 'weakDmg']);
});

test('growthLabel：四種標籤', () => {
  assert.equal(growthLabel(0, 0, rules), 'notStarted');
  assert.equal(growthLabel(3, 2, rules), 'great');
  assert.equal(growthLabel(3, 1, rules), 'bad');
  assert.equal(growthLabel(5, 2, rules), 'normal');
});

test('analyzeGrowth：長歪＋預估句子', () => {
  const g = analyzeGrowth(core({
    level: 9,
    subs: [
      { stat: 'critRate', initial: 1.2, current: 1.2 },
      { stat: 'defFlat', initial: 20, current: 57.5 },
      { stat: 'hpPct', initial: 7, current: 7 },
      { stat: 'critDmg', initial: 2.5, current: 2.5 },
    ],
  }), 'atk', rules);
  assert.equal(g.n, 3);
  assert.equal(g.goodHits, 0);
  assert.equal(g.label, 'bad');
  assert.equal(g.forecast, '還能再長 2 次，每次大約 50% 會長在暴擊或暴傷上');
});

test('analyzeGrowth：天生 2 條都是好詞條＝極品胚子', () => {
  const g = analyzeGrowth(core({ subs: [{ stat: 'critRate', initial: 1.5, current: 1.5 }, { stat: 'critDmg', initial: 3, current: 3 }] }), 'hp', rules);
  assert.equal(g.premiumSeed, true);
  assert.equal(g.label, 'notStarted');
});

test('analyzeGrowth：推估時好強化次數不會超過 n', () => {
  const g = analyzeGrowth(core({ level: 3, subs: [{ stat: 'critRate', initial: null, current: 3.0 }] }), 'atk', rules);
  assert.equal(g.estimated, true);
  assert.equal(g.goodHits, 1);
});
