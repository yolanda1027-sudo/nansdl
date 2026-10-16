// 規格書「範例芯核（測試用）」整組預期結果
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rules, companionsData, exampleCore } from './helpers.js';
import { validateCore } from '../src/validate.js';
import { scoreForType, scoreCompanions, bestOf, overallVerdict } from '../src/scoring.js';
import { analyzeGrowth } from '../src/growth.js';

const core = () => validateCore(exampleCore(), rules).core;

test('範例：通過驗證（主副詞條一樣是正常的）', () => {
  const v = validateCore(exampleCore(), rules);
  assert.equal(v.ok, true);
  assert.equal(v.errors.length, 0);
  assert.equal(v.warnings.length, 0);
});

test('範例：攻擊型 87、防禦型 82、生命型 86', () => {
  assert.equal(scoreForType(core(), 'atk', rules).score, 87);
  assert.equal(scoreForType(core(), 'def', rules).score, 82);
  assert.equal(scoreForType(core(), 'hp', rules).score, 86);
});

test('範例：已強化 3 次（暴傷 2、暴擊 1）', () => {
  const g = analyzeGrowth(core(), 'atk', rules);
  assert.equal(g.n, 3);
  const hits = Object.fromEntries(g.rows.map((r) => [r.stat, r.hits]));
  assert.deepEqual(hits, { critDmg: 2, atkPct: 0, critRate: 1, hpFlat: 0 });
});

test('範例：對任一型都是「長得很好」', () => {
  for (const t of ['atk', 'def', 'hp']) {
    const g = analyzeGrowth(core(), t, rules);
    assert.equal(g.goodHits, 3, t);
    assert.equal(g.label, 'great', t);
  }
});

test('範例：總結論「留，升滿」', () => {
  const c = core();
  const best = bestOf(scoreCompanions(c, companionsData.companions, rules));
  assert.equal(best.score, 87);
  assert.equal(best.type, 'atk');
  const g = analyzeGrowth(c, best.type, rules);
  assert.equal(overallVerdict(c, best, g.label, rules).text, '留，升滿');
});

test('範例：光獵 82、深淵主宰 86', () => {
  const scored = scoreCompanions(core(), companionsData.companions, rules);
  const by = Object.fromEntries(scored.map((s) => [s.companion.name, s.result.score]));
  assert.equal(by['光獵'], 82);
  assert.equal(by['深淵主宰'], 86);
});
