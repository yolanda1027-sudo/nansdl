import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));

export const rules = load('rules.json');
export const companionsData = load('companions.json');

// 規格書的範例芯核（強化次數＝遊戲裡的黃色數字）
export const exampleCore = () => ({
  slot: 'delta',
  rarity: 'SSR',
  level: 9,
  main: 'critRate',
  build: 'crit',
  subs: [
    { stat: 'critDmg', hits: 2, current: 5.2 },
    { stat: 'atkPct', hits: 0, current: 8 },
    { stat: 'critRate', hits: 1, current: 2.0 },
    { stat: 'hpFlat', hits: 0, current: 900 },
  ],
});

// 使用者截圖的粉珀 β 芯核（+0，誓約增傷帶 1 次 0 級補償強化）
export const screenshotCore = () => ({
  slot: 'beta',
  rarity: 'SSR',
  level: 0,
  main: 'defPct',
  build: 'crit',
  subs: [
    { stat: 'atkFlat', hits: 0, current: 53 },
    { stat: 'oathDmg', hits: 1, current: 1.4 },
    { stat: 'weakDmg', hits: 0, current: 2.4 },
  ],
});
