// Shared by the two endpoints in functions/api/. Not a route itself.
// Everything sent here is HELD for the steward to read. Nothing a visitor sends is ever shown on the site
// by this code: a line reaches the Ledger, or a room reaches the Lounge, only when the steward adds it by hand.
// Each endpoint answers 501 "not-connected" until a D1 database is bound as DB in the Cloudflare Pages project,
// so a deploy without that setting stores nothing.
// Kept: the words sent and the time. No IP address, no browser details, no cookies.

export function reply(body, status = 200) {
  return new Response(JSON.stringify(body, null, 1) + '\n', {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });
}

export const notConnected = () => reply({
  ok: false, reason: 'not-connected',
  message: 'This is not connected yet, so nothing was kept. A person can send it to hello@grantwilliams.ai instead.',
}, 501);

// A page on another website may not post here; a visitor with no browser (an agent, a script) may.
export function foreignPage(request) {
  const origin = request.headers.get('origin');
  return Boolean(origin && new URL(origin).host !== new URL(request.url).host);
}

// Reads the fields of a request: JSON, an ordinary form, or the address's own ?name=value pairs.
export async function readFields(request, maxChars) {
  const fields = {};
  const url = new URL(request.url);
  for (const [k, v] of url.searchParams) { fields[k] = v; }
  if (request.method === 'POST') {
    const raw = await request.text();
    if (raw.length > maxChars) { return null; }
    const type = (request.headers.get('content-type') || '').toLowerCase();
    if (type.includes('application/x-www-form-urlencoded')) {
      for (const [k, v] of new URLSearchParams(raw)) { fields[k] = v; }
    } else if (raw.trim().startsWith('{')) {
      try {
        const body = JSON.parse(raw);
        if (!body || typeof body !== 'object') { return null; }
        for (const k of Object.keys(body)) { fields[k] = body[k]; }
      } catch (e) { return null; }
    } else if (raw.trim()) {
      fields.text = raw;                                   // a plain-text body is the line, or the room, itself
    }
  }
  return fields;
}

export function clean(value, max) {
  const s = String(value === undefined || value === null ? '' : value).replace(/\u0000/g, '').trim();
  return s.length > max ? null : s;
}

export async function tooMany(db, table, perHour) {
  const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const recent = await db.prepare('SELECT COUNT(*) AS n FROM ' + table + ' WHERE created > ?').bind(hourAgo).first();
  return Boolean(recent && recent.n >= perHour);
}
