// The effect-size chart.
//
// A chart is a claim about numbers made in a form nobody checks against the
// source, which is the one thing this project is supposed to never do. So the
// parts that could quietly lie are pinned here: where the null sits, what gets
// drawn on a shared axis, and what happens when an interval is missing.

import test from 'node:test';
import assert from 'node:assert/strict';

import { effectPlot } from '../src/templates/entry.mjs';
import { loadCorpus } from '../build/corpus.mjs';

const es = (o) => ({ esType: 'd', ...o });

test('the null line sits at zero for a standardised difference', () => {
  const svg = effectPlot({ replicated: es({ es: 0.4, ci: [0.2, 0.6], ciLevel: 95 }) });
  assert.match(svg, /no effect<\/text>/);
  assert.doesNotMatch(svg, /OR 1/);
});

test('the null line sits at one for an odds ratio', () => {
  // Ten entries carry an OR. Drawing their null at zero would put every one of
  // them far to the right of a line meaning nothing, which reads as a huge
  // effect — the chart would say the opposite of the data for a whole esType.
  const svg = effectPlot({ replicated: { esType: 'OR', es: 1.93, ci: [1.06, 3.53], ciLevel: 95 } });
  assert.match(svg, /no effect \(OR 1\)/);
  // The null must be inside the drawn range, not clipped off an edge.
  const nullX = Number(svg.match(/class="fx-null" x1="([\d.]+)"/)[1]);
  const pointX = Number(svg.match(/class="fx-pt[^"]*" cx="([\d.]+)"/)[1]);
  assert.ok(nullX > 0 && nullX < 640, 'null line is inside the viewBox');
  assert.ok(pointX > nullX, 'an OR above 1 is drawn to the right of the null');
});

test('two estimates are only drawn on one axis when their scales match', () => {
  const same = effectPlot({ original: es({ es: 0.8 }), replicated: es({ es: 0.1 }) });
  assert.equal((same.match(/class="fx-pt/g) || []).length, 2);

  // A d against an r on a shared axis is a comparison of nothing. No pair in
  // the corpus does this today; the guard is for the edit that introduces one.
  const mixed = effectPlot({ original: es({ es: 0.8 }), replicated: { esType: 'r', es: 0.1 } });
  assert.equal(mixed, '', 'mismatched scales produce no chart at all');
});

test('a missing interval is drawn as a bare point, never as invented whiskers', () => {
  const svg = effectPlot({ replicated: es({ es: 0.3 }) });
  assert.equal((svg.match(/class="fx-pt/g) || []).length, 1);
  assert.equal((svg.match(/class="fx-ci/g) || []).length, 0);
  assert.match(svg, /no interval reported/);
});

test('the interval level is read from the entry, not assumed', () => {
  // The corpus holds 90, 95 and 99 per cent intervals.
  const svg = effectPlot({ replicated: es({ es: 0.3, ci: [0.1, 0.5], ciLevel: 99 }) });
  assert.match(svg, /99% CI 0\.10 to 0\.50/);
  assert.doesNotMatch(svg, /95% CI/);
});

test('nothing is drawn when there is no effect size to draw', () => {
  assert.equal(effectPlot({}), '');
  assert.equal(effectPlot({ study: { n: 100 } }), '');
  assert.equal(effectPlot({ replicated: { esType: 'd' } }), '', 'an es-less object is not a point');
});

test('every chart the real corpus produces is finite and inside its viewBox', async () => {
  const entries = await loadCorpus();
  let drawn = 0;
  for (const e of entries) {
    const svg = effectPlot(e.replication);
    if (!svg) continue;
    drawn++;
    assert.doesNotMatch(svg, /NaN|Infinity|undefined/, `${e.slug} has a non-finite coordinate`);
    for (const m of svg.matchAll(/\b(?:cx|x1|x2)="([-\d.]+)"/g)) {
      const v = Number(m[1]);
      assert.ok(Number.isFinite(v) && v >= 0 && v <= 640, `${e.slug} draws x=${m[1]} outside the viewBox`);
    }
  }
  // Guards against the chart silently disappearing from every page.
  assert.ok(drawn > 200, `only ${drawn} charts drawn`);
});
