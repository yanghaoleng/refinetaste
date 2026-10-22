import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Calligraph } from 'calligraph';

// Small React islands: the course and model requests stay in the existing app.
const entries = new Map();
const active = new Set();
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
const count = value => [...segmenter.segment(String(value))].length;
const duration = value => 240 + Math.min(550, Math.max(0, count(value) - 1) * 18);
function render(host, value, variant) {
  if (!host) return;
  let entry = entries.get(host);
  if (!entry) {
    host.replaceChildren();
    entry = { root: createRoot(host), value, variant };
    entries.set(host, entry);
  }
  entry.value = value;
  entry.variant = variant;
  flushSync(() => entry.root.render(preference.matches
    ? <span>{value}</span>
    : <Calligraph variant={variant} initial={false} autoSize={false}
        animation={variant === 'slots' ? 'snappy' : 'default'}
        className={variant === 'text' ? 'calligraph-text' : 'calligraph-slots'}
        style={variant === 'text' ? { display: 'inline', overflowWrap: 'anywhere' } : undefined}>
        {value}
      </Calligraph>));
}
function text(host, { delay = 0 } = {}) {
  if (!host) return [];
  const value = entries.get(host)?.value ?? host.textContent;
  render(host, value, 'text');
  if (preference.matches) return [];
  const glyphs = [...host.querySelectorAll('.calligraph-text > span')];
  const step = glyphs.length > 1 ? Math.min(18, 550 / (glyphs.length - 1)) : 0;
  // Calligraph 1.4.1 Text reconciles graphemes; add a bounded initial stagger.
  return glyphs.map((glyph, index) => {
    const animation = glyph.animate([
      { opacity: 0, transform: 'translateY(6px)', filter: 'blur(3px)' },
      { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' }
    ], { duration: 240, delay: delay + index * step, easing: 'cubic-bezier(.19,1,.22,1)', fill: 'backwards' });
    active.add(animation);
    animation.finished.then(() => active.delete(animation), () => active.delete(animation));
    return animation;
  });
}
function slots(host, value) { render(host, String(value), 'slots'); }
preference.addEventListener('change', () => {
  for (const animation of active) { try { animation.finish(); } catch { animation.cancel(); } }
  active.clear();
  for (const [host, entry] of entries) if (host.isConnected) render(host, entry.value, entry.variant);
});
new MutationObserver(() => {
  for (const [host, entry] of entries) if (!host.isConnected) {
    entry.root.unmount();
    entries.delete(host);
  }
}).observe(document.body, { childList: true, subtree: true });
window.RefineText = { text, slots, duration };
