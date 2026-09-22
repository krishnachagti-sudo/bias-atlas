// URL shapes for the grouping hubs.
//
// These live alone, importing nothing but the category table and the slugifier,
// to break an import cycle rather than to be tidy. The entry template needs to
// link to a field hub; the hubs template needs the entry template's `entryPath`
// and verdict vocabulary. With both helpers defined in hubs.mjs that is a cycle,
// and it *worked* — because every one of them is an arrow const that is only
// ever called at render time, by which point both modules have finished
// evaluating. The first person to call fieldPath at module scope would have got
// "undefined is not a function" and no clue why. So: the shared half sits here,
// and the dependency runs one way.

import { CATEGORIES } from '../../build/corpus.mjs';
import { slugify } from '../../build/slugify.mjs';

// The URL segment per verdict. `failed` is spelled out because "/verdict/failed/"
// reads as an error state rather than as a finding about an experiment.
const VERDICT_SLUG = {
  replicated: 'replicated',
  failed: 'failed-to-replicate',
  mixed: 'mixed',
  'none-located': 'no-replication-located',
};

export const verdictSlug = (state) => VERDICT_SLUG[state];
export const verdictPath = (state) => `verdict/${VERDICT_SLUG[state]}/`;
export const fieldPath = (cat) => `field/${slugify(CATEGORIES[cat] || cat)}/`;
export const personPath = (slug) => `named-by/${slug}/`;

/** A decade page under the timeline, e.g. `timeline/1970s/`. */
export const decadePath = (decade) => `timeline/${decade}s/`;
