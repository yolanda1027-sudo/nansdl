import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rules } from './helpers.js';
import { validateCore, normalizeCore, checkSubValue } from '../src/validate.js';

test('normalizeCore：α 自動帶生命、γ 自動帶攻擊、空白列拿掉', () => {
  const a = normalizeCore({ slot: 'alpha', rarity: 'SSR', level: 0, subs: [{ stat: '' }, { stat: 'critRate', current: 1.2 }] }, rules);
  assert.equal(a.main, 'hpFlat');
  assert.equal(a.subs.length, 1);
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

test('checkSubValue：初始暴擊 2.4% 標記補償強化，不算錯', () => {
  assert.equal(checkSubValue({ stat: 'critRate', initial: 2.4, current: 2.4 }, 'SSR', rules).initial, 'compensated');
  const v = validateCore({ slot: 'alpha', rarity: 'SSR', level: 0, subs: [{ stat: 'critRate', initial: 2.4, current: 2.4 }] }, rules);
  assert.equal(v.ok, true);
  assert.equal(v.flags[0].kind, 'compensated');
  assert.equal(v.warnings.length, 0);
});

test('checkSubValue：超出範圍會提醒，紫芯核不檢查範圍', () => {
  assert.equal(checkSubValue({ stat: 'critRate', initial: 0.5, current: 9 }, 'SSR', rules).initial, 'out');
  assert.equal(checkSubValue({ stat: 'critRate', initial: 0.5, current: 9 }, 'SSR', rules).current, 'out');
  assert.equal(checkSubValue({ stat: 'critRate', initial: 1.5, current: 1.2 }, 'SSR', rules).current, 'out');
  assert.deepEqual(checkSubValue({ stat: 'critRate', initial: 0.5, current: 9 }, 'SR', rules), { initial: 'ok', current: 'ok' });
});
