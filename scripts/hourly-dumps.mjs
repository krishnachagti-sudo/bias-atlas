// Reads Wikipedia's hourly pageview dumps for the Tome's own articles.
// Ported from the Law Tome. Shared by wave-hourly.mjs (fills the cache) and
// wave-detect.mjs (the fresh 24-hour signal). Bias entries carry no sameAs, so
// the caller passes titleOf (src/data/wiki-titles.json). Each dump is 30-130 MB gzipped and is streamed, never written to
// disk; only the counts for the Atlas's articles are cached, one small JSON file
// per hour in waves/out/hourly/.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { createInterface } from 'node:readline';

const UA = { 'user-agent': 'BiasAtlas-wave-detector/0.1 (https://conyso.com/biases/)' };
const BASE = 'https://dumps.wikimedia.org/other/pageviews';
const pad = (n) => String(n).padStart(2, '0');
export const hourKey = (f) => f.match(/pageviews-(\d{8}-\d{2})/)[1];
const writeAtomic = (url, data) => { const tmp = new URL(`${url.href}.tmp`); writeFileSync(tmp, data); renameSync(tmp, url); };

export function titleIndex(laws, titleOf) {
  const m = new Map();
  for (const l of laws) { const t = titleOf(l); if (t) m.set(t.replace(/ /g, '_'), l.slug); }
  return m;
}

/** Every dump file in this month and last, oldest first. */
export async function listDumps() {
  const months = [0, 1].map((back) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - back); return `${d.getUTCFullYear()}/${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; });
  const files = [];
  for (const m of months) {
    const html = await fetch(`${BASE}/${m}/`, { headers: UA, signal: AbortSignal.timeout(30000) }).then((r) => (r.ok ? r.text() : '')).catch(() => '');
    for (const [, f] of html.matchAll(/href="(pageviews-\d{8}-\d{6}\.gz)"/g)) files.push(`${m}/${f}`);
  }
  return [...new Set(files)].sort();
}

async function readDump(file, titles) {
  const res = await fetch(`${BASE}/${file}`, { headers: UA, signal: AbortSignal.timeout(15 * 60e3) });
  if (!res.ok) throw new Error(`${file} returned ${res.status}`);
  const counts = {};
  const lines = createInterface({ input: Readable.fromWeb(res.body).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of lines) {
    // "en Title views bytes" (desktop) and "en.m Title views bytes" (mobile).
    if (!(line.startsWith('en ') || line.startsWith('en.m '))) continue;
    const [, title, views] = line.split(' ');
    const slug = titles.get(title);
    if (slug) counts[slug] = (counts[slug] || 0) + Number(views);
  }
  return counts;
}

/**
 * Make sure the newest `hours` dumps are cached, reading the missing ones
 * newest first, two at a time (dumps.wikimedia.org limits connections per IP).
 * Returns the keys of the window, oldest first, and how many were read.
 */
export async function fillHours(cacheDir, laws, { titleOf, hours = 24, maxRead = hours, log = console.error } = {}) {
  mkdirSync(cacheDir, { recursive: true });
  const all = await listDumps();
  if (!all.length) return { keys: [], read: 0, failed: 0, listed: false };
  const window = all.slice(-hours);
  const missing = window.filter((f) => !existsSync(new URL(`${hourKey(f)}.json`, cacheDir))).reverse().slice(0, maxRead);
  const titles = titleIndex(laws, titleOf);
  let read = 0, failed = 0, i = 0;
  await Promise.all([0, 1].map(async () => {
    while (i < missing.length) {
      const f = missing[i++];
      const t0 = Date.now();
      try {
        writeAtomic(new URL(`${hourKey(f)}.json`, cacheDir), JSON.stringify(await readDump(f, titles)) + '\n');
        read++;
        log(`hourly: ${hourKey(f)} read in ${Math.round((Date.now() - t0) / 1000)}s`);
      } catch (e) { failed++; log(`hourly: ${hourKey(f)} failed (${e.message})`); }
    }
  }));
  return { keys: window.map(hourKey), read, failed, listed: true };
}

/** Sum the cached hours: the newest 24 and the 24 before them. */
export function sumWindows(cacheDir, newestKey) {
  const keys = new Set(readdirSync(cacheDir).filter((f) => /^\d{8}-\d{2}\.json$/.test(f)).map((f) => f.slice(0, 11)));
  const at = (k) => Date.UTC(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8), +k.slice(9, 11));
  const keyOf = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}`; };
  const end = at(newestKey);
  const sums = { last: {}, prev: {}, lastHours: 0, prevHours: 0 };
  for (let h = 0; h < 48; h++) {
    const k = keyOf(end - h * 3600e3);
    if (!keys.has(k)) continue;
    let counts; try { counts = JSON.parse(readFileSync(new URL(`${k}.json`, cacheDir), 'utf8')); } catch { continue; }
    const side = h < 24 ? 'last' : 'prev';
    sums[`${side}Hours`]++;
    for (const [slug, n] of Object.entries(counts)) sums[side][slug] = (sums[side][slug] || 0) + n;
  }
  return sums;
}
