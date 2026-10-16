import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));

export const rules = load('rules.json');
export const companionsData = load('companions.json');

// 規格書的範例芯核
export const exampleCore = () => ({
  slot: 'delta',
  rarity: 'SSR',
  level: 9,
  main: 'critRate',
  build: 'crit',
  subs: [
    { stat: 'critDmg', initial: 2.5, current: 5.2 },
    { stat: 'atkPct', initial: 8, current: 8 },
    { stat: 'critRate', initial: 1.2, current: 2.0 },
    { stat: 'hpFlat', initial: 900, current: 900 },
  ],
});
