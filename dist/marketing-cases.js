/* Original fictional briefs: compare the reasoning in equally legible case cards. */
(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(v){
  const layout=['plan','profile','story','metrics','journey'].includes(v.layout)?v.layout:'plan',tone=['neutral','coherent','mixed'].includes(v.tone)?v.tone:'neutral';
  return `<figure class="marketing-case marketing-${layout} marketing-${tone}" aria-label="${esc(v.title)}"><figcaption><span class="marketing-tag">${esc(v.tag||'案例记录')}</span><strong>${esc(v.title)}</strong></figcaption>${v.metrics?.length?`<dl class="marketing-metrics">${v.metrics.map(m=>`<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd>${m.note?`<small>${esc(m.note)}</small>`:''}</div>`).join('')}</dl>`:''}<dl class="marketing-rows">${(v.rows||[]).map((r,i)=>`<div>${layout==='journey'?`<span class="marketing-step" aria-hidden="true">${i+1}</span>`:''}<dt>${esc(r.label)}</dt><dd>${esc(r.text)}</dd></div>`).join('')}</dl><p class="marketing-footnote">${esc(v.footnote)}</p></figure>`;
 }
 window.RefineMarketing={render};
})();
