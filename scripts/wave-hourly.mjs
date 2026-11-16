// Keeps the last 24 hours of Wikipedia's hourly pageview dumps read for the
// Atlas's own articles, so the daily detector's fresh 24-hour signal is ready
// when it runs. Run every 3 hours by law-tome-waves' Waves workflow.
//
//   node scripts/wave-hourly.mjs [--hours N]
import { readdirSync, readFileSync } from 'node:fs';
import { fillHours } from './hourly-dumps.mjs';

const args = process.argv.slice(2);
const hours = args.includes('--hours') ? Number(args[args.indexOf('--hours') + 1]) : 24;
const dir = new URL('../src/data/biases/', import.meta.url);
const laws = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
const titles = JSON.parse(readFileSync(new URL('../src/data/wiki-titles.json', import.meta.url), 'utf8'));
const filled = await fillHours(new URL('../waves/out/hourly/', import.meta.url), laws, { titleOf: (l) => titles[l.slug], hours });
if (!filled.listed) { console.error('hourly: could not list the dump directory'); process.exit(1); }
console.log(`hourly: window of ${filled.keys.length} hours, ${filled.read} read this run${filled.failed ? `, ${filled.failed} failed` : ''}`);
