import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rules, screenshotCore } from './helpers.js';
import { validateCore, normalizeCore, checkSubValue, plausibleRange } from '../src/validate.js';

test('normalizeCore：α 自動帶生命、γ 自動帶攻擊、空白列拿掉、強化次數預設 0', () => {
  const a = normalizeCore({ slot: 'alpha', rarity: 'SSR', level: 0, subs: [{ stat: '' }, { stat: 'critRate', current: 1.2 }] }, rules);
  assert.equal(a.main, 'hpFlat');
  assert.deepEqual(a.subs, [{ stat: 'critRate', hits: 0, current: 1.2 }]);
  const g = normalizeCore({ slot: 'gamma', main: 'critRate', subs: [] }, rules);
  assert.equal(g.main, 'atkFlat');
});

test('validateCore：缺槽位、稀有度、β 主詞條都會報錯', () => {
  const v1 = validateCore({ subs: [{ stat: 'critRate', current: 1.2 }] }, rules);
  assert.deepEqual(v1.errors.map((e) => e.field).sort(), ['rarity', 'slot']);
  const v2 = validateCore({ slot: 'beta', rarity: 'SSR', level: 0, subs: [{ stat: 'critRate', current: 1.2 }] }, rules);
  assert.equal(v2.errors[0].field, 'main');
});

test('validateCore：等級超過稀有度上限會報錯', () => {
  const v = validateCore({ slot: 'alpha', rarity: 'SR', level: 15, subs: [{ stat: 'critRate', current: 1.2 }] }, rules);
  assert.ok(v.errors.some((e) => e.field === 'level'));
});

test('validateCore：副詞條重複、沒填目前數值會報錯', () => {
  const v = validateCore({
    slot: 'alpha', rarity: 'SSR', level: 3,
    subs: [{ stat: 'critRate', current: 1.2 }, { stat: 'critRate', current: 1.5 }, { stat: 'critDmg' }],
  }, rules);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.msg.includes('重複')));
  assert.ok(v.errors.some((e) => e.field === 'current' && e.row === 2));
});

test('plausibleRange：依強化次數算範圍；誓約增傷查不到回 null', () => {
  assert.deepEqual(plausibleRange('critRate', 0, rules), { min: 1.1, max: 1.6 });
  assert.deepEqual(plausibleRange('critRate', 2, rules), { min: 2.2, max: 3.2 });
  assert.equal(plausibleRange('critRate', 5, rules).max, 5.6);
  assert.equal(plausibleRange('oathDmg', 1, rules), null);
});

test('checkSubValue：0 級暴擊 2.4% 不合理，但帶 1 次強化就合理', () => {
  assert.equal(checkSubValue({ stat: 'critRate', hits: 0, current: 2.4 }, 'SSR', rules), 'out');
  assert.equal(checkSubValue({ stat: 'critRate', hits: 1, current: 2.4 }, 'SSR', rules), 'ok');
  assert.equal(checkSubValue({ stat: 'critRate', hits: 0, current: 9 }, 'SR', rules), 'ok');
  assert.equal(checkSubValue({ stat: 'oathDmg', hits: 1, current: 1.4 }, 'SSR', rules), 'unknown');
});

test('validateCore：截圖芯核可以通過，誓約增傷是合法副詞條', () => {
  const v = validateCore(screenshotCore(), rules);
  assert.equal(v.ok, true);
  assert.equal(v.warnings.length, 0);
});

test('validateCore：黃色數字加總和等級對不上會提醒', () => {
  const v = validateCore({ slot: 'alpha', rarity: 'SSR', level: 3, subs: [{ stat: 'critRate', hits: 5, current: 4.5 }] }, rules);
  assert.ok(v.warnings.some((w) => w.field === 'hits' && w.row == null));
});
