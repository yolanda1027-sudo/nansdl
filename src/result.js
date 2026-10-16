// 結果區畫面：總結論卡 → 長歪區塊 → 男主篩選 → 搭檔分數清單。

const TYPE_LABEL = { atk: '攻擊型', def: '防禦型', hp: '生命型', unknown: '待查' };
const TYPE_SHORT = { atk: '攻', def: '防', hp: '生', unknown: '?' };
const BASIS_LABEL = {
  spec: '規格書已核對',
  'bwiki-oath': 'BWIKI 誓約技公式（透過網路搜尋讀到，還沒人工開頁核對）',
  'enwiki-oath': '英文 wiki 誓約技公式（BWIKI 搜不到這頁）',
  'other-skills': '誓約技倍率沒查到，用其他技能的公式推定',
  none: '查不到',
};

function fmt(n, d = 1) {
  return (Math.round(n * 10 ** d) / 10 ** d).toString();
}

function whoText(best) {
  const names = best.companions.map((c) => c.name);
  if (names.length === 1) return names[0];
  const head = names.slice(0, 2).join('、');
  return `${TYPE_LABEL[best.type]}搭檔（${head}${names.length > 2 ? `等 ${names.length} 位` : ''}）`;
}

function verdictSentence(model) {
  const { verdict, best, core } = model;
  if (verdict.reason === 'rarity') return '藍色芯核不算分，拆掉換芯核能量就好。';
  const who = whoText(best);
  if (verdict.key === 'keep') return `這顆很適合${who}，建議升滿。`;
  if (verdict.reason === 'grewBadly') return `分數夠高，但升級大多長在用不到的詞條上。可以先給${who}用，先別再砸資源升。`;
  if (verdict.key === 'hold') return `可以先給${who}當過渡，有更好的再換。`;
  return core.rarity === 'SR'
    ? '紫色芯核分數打六折後，沒有搭檔特別需要它，拆掉換芯核能量。'
    : '沒有搭檔特別需要它，拆掉換芯核能量。';
}

function renderVerdict(model, rules, esc) {
  const { verdict, best, growth, core } = model;
  const rarity = rules.rarities[core.rarity];
  const pills = [];
  if (growth) pills.push(`<span class="pill g-${growth.label}">${esc(growth.labelText)}</span>`);
  if (rarity && rarity.tag && rarity.scored) pills.push(`<span class="pill p-tag">${esc(rarity.tag)}</span>`);
  if (growth && growth.premiumSeed) pills.push('<span class="pill p-seed">極品胚子</span>');
  return `
    <section class="verdict v-${verdict.key}" aria-labelledby="v-title">
      <div class="v-top">
        <div>
          <div class="eyebrow">總結論</div>
          <h2 class="v-title" id="v-title">${esc(verdict.text)}</h2>
        </div>
        ${best ? `<div class="v-score"><span class="num">${best.score}</span><span class="v-score-lbl">最高適配分</span></div>` : ''}
      </div>
      <p class="v-sentence">${esc(verdictSentence(model))}</p>
      ${pills.length ? `<div class="pills">${pills.join('')}</div>` : ''}
    </section>`;
}

function renderGrowth(model, rules, esc) {
  const g = model.growth;
  if (!g) return '';
  const rows = g.rows
    .map((r) => `<li class="${r.good ? 'good' : ''}"><span>${esc(rules.stats[r.stat].label)}</span><b class="num">×${r.hits}</b></li>`)
    .join('');
  const notes = [];
  if (g.estimated) notes.push('有副詞條沒填初始數值，強化次數是用目前數值推估的。');
  if (model.core.rarity === 'SR') notes.push('紫芯核的副詞條範圍還沒查到，強化次數只能參考。');
  if (g.premiumSeed) notes.push('天生只有 2 條，而且都是好詞條，之後每次強化都會落在它們身上。');
  return `
    <section class="card growth" aria-labelledby="g-title">
      <div class="g-head">
        <h2 id="g-title">升級長得怎麼樣</h2>
        <span class="pill g-${g.label}">${esc(g.labelText)}</span>
      </div>
      <div class="g-stats">
        <div><span class="num">${g.n}</span><span>已強化</span></div>
        <div><span class="num">${g.goodHits}</span><span>落在好詞條</span></div>
        <div><span class="num">${g.left}</span><span>還能再長</span></div>
      </div>
      <p class="g-advice">${esc(g.advice)}。${esc(g.forecast)}。</p>
      <ul class="g-rows" aria-label="每條副詞條被強化的次數">${rows}</ul>
      <p class="hint">粉色＝對「${esc(TYPE_LABEL[model.best.type])}」有用的好詞條${g.estimated ? ' · 含推估' : ''}</p>
      ${notes.map((t) => `<p class="hint">${esc(t)}</p>`).join('')}
    </section>`;
}

function renderWhy(item, model, rules, esc) {
  const { companion: c, result: r, unknown } = item;
  const rows = r.rows
    .map((row) => {
      const verdict = row.weight >= rules.growth.goodWeight ? '加分' : row.weight > 0 ? '小加分' : '沒用';
      const cls = row.weight >= rules.growth.goodWeight ? 'w-good' : row.weight > 0 ? 'w-some' : 'w-none';
      return `<tr class="${cls}"><td>${esc(rules.stats[row.stat].label)}</td><td class="num">${fmt(row.grids)} 格</td><td class="num">×${row.weight}</td><td>${verdict}</td></tr>`;
    })
    .join('');
  const main = r.main == null
    ? `<p>${esc(rules.slots[model.core.slot].symbol)} 槽的主詞條固定，只看副詞條。</p>`
    : `<p>主詞條「${esc(rules.stats[model.core.main].label)}」得 <b class="num">${r.main}</b> 分（佔 35%），副詞條比 <b class="num">${fmt(r.ratio * 100, 0)}%</b>（佔 65%）。</p>`;
  return `
    <div class="why">
      ${unknown ? `<p class="unknown-note">這個搭檔的屬性還沒核對，分數僅供參考（先用三種型別裡最低的分數）。</p>` : ''}
      ${main}
      <div class="why-table"><table>
        <thead><tr><th>副詞條</th><th>格數</th><th>權重</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="src">型別：${esc(TYPE_LABEL[c.type])} · ${esc(BASIS_LABEL[c.basis] || '')}<br>
        ${esc(c.evidence)}<br>
        <a href="${esc(c.source)}" target="_blank" rel="noopener">看來源</a></p>
    </div>`;
}

export function renderResult(container, model, rules, data, filter, esc) {
  if (!model.verdict) {
    container.innerHTML = '';
    return;
  }
  let html = renderVerdict(model, rules, esc);
  if (model.scored) {
    html += renderGrowth(model, rules, esc);
    const leadChips = [`<button type="button" class="chip ${filter.size === 0 ? 'on' : ''}" data-lead="" aria-pressed="${filter.size === 0}">全部</button>`]
      .concat(data.leads.map((l) => `<button type="button" class="chip ${filter.has(l.id) ? 'on' : ''}" data-lead="${l.id}" aria-pressed="${filter.has(l.id)}">${esc(l.name)}</button>`))
      .join('');
    const groups = data.leads
      .filter((l) => filter.size === 0 || filter.has(l.id))
      .map((l) => {
        const items = model.scored
          .filter((s) => s.companion.lead === l.id)
          .sort((a, b) => (b.result.raw ?? -1) - (a.result.raw ?? -1));
        const lis = items
          .map((it) => {
            const color = model.dot(it.result.score);
            return `
            <li><details>
              <summary>
                <span class="dot dot-${color}" aria-hidden="true"></span>
                <span class="c-name">${esc(it.companion.name)}</span>
                <span class="type-chip t-${it.companion.type}" title="${esc(TYPE_LABEL[it.companion.type])}">${TYPE_SHORT[it.companion.type]}</span>
                <span class="c-score num">${it.result.score ?? '—'}${it.unknown ? '<sup class="q" title="這個搭檔的屬性還沒核對，分數僅供參考">?</sup>' : ''}</span>
              </summary>
              ${renderWhy(it, model, rules, esc)}
            </details></li>`;
          })
          .join('');
        return `<div class="lead-group"><h3>${esc(l.name)}</h3><ul class="c-list">${lis}</ul></div>`;
      })
      .join('');
    html += `
      <section class="card list" aria-labelledby="l-title">
        <h2 id="l-title">每個搭檔的分數</h2>
        <p class="hint">點一列看為什麼。綠點 ≥75、黃點 55–74、灰點 &lt;55；攻／防／生是搭檔吃哪種屬性。</p>
        <div class="chips" role="group" aria-label="只看這些男主">${leadChips}</div>
        ${groups}
      </section>`;
  }
  container.innerHTML = html;
}
