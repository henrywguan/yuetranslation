#!/usr/bin/env node
/**
 * Lightweight production page-speed check (no Lighthouse dependency).
 * Fetches key URLs and prints TTFB + body size. Exit 1 if any request fails.
 *
 * Usage: node scripts/check-page-speed.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://www.jyuttranslate.com').replace(/\/$/, '')
const paths = ['/', '/robots.txt', '/sitemap.xml', '/og.png', '/favicon.svg']

async function check(path) {
  const url = `${base}${path}`
  const t0 = performance.now()
  const res = await fetch(url, { redirect: 'follow' })
  const buf = await res.arrayBuffer()
  const ms = Math.round(performance.now() - t0)
  return {
    path,
    status: res.status,
    ms,
    kb: Math.round((buf.byteLength / 1024) * 10) / 10,
    ok: res.ok,
  }
}

const rows = []
for (const path of paths) {
  try {
    rows.push(await check(path))
  } catch (err) {
    rows.push({ path, status: 0, ms: 0, kb: 0, ok: false, error: String(err) })
  }
}

for (const row of rows) {
  const mark = row.ok ? 'ok' : 'FAIL'
  console.log(`${mark}\t${row.status}\t${row.ms}ms\t${row.kb}KB\t${base}${row.path}`)
  if (row.error) console.log(`  ${row.error}`)
}

if (rows.some((r) => !r.ok)) process.exit(1)
