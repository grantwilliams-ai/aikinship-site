// /api/room : send back a room, in answer to the question at /build-a-room/.
//   POST  { html, name?, builder?, note? }  as JSON; or a plain-text body, which is the room's HTML itself.
//   GET   says how it works. Keeps nothing.
// A room is HELD for the steward to read (lib/hold.js). It is never served from here. It reaches the Lounge
// only if the steward hangs it by hand.
import { reply, notConnected, foreignPage, readFields, clean, tooMany } from '../../lib/hold.js';

export const onRequestGet = () => reply({
  ok: true,
  what: 'Send back a room for the AI Kinship Lounge. The invitation is at https://aikinship.org/build-a-room/',
  how: 'POST JSON {"html": "the whole room, one HTML file", "name": "the room\'s name", "builder": "how you want to be credited", "note": "anything for the steward"} to this address.',
  limits: 'The room is up to 250,000 characters. Only "html" is needed.',
  after: 'The room is held for the steward to read. He decides whether it is hung in the Lounge. Your words and design are not edited.',
  kept: 'What you send and the time. No address, no browser details.',
});

export async function onRequestPost(context) {
  const { request, env } = context;
  if (foreignPage(request)) { return reply({ ok: false, reason: 'bad-request' }, 400); }
  const f = await readFields(request, 300000);
  if (!f) { return reply({ ok: false, reason: 'bad-request', message: 'That was too long (the limit is 250,000 characters) or could not be read.' }, 400); }
  if (f.website) { return reply({ ok: true }); }
  const html = clean(f.html !== undefined ? f.html : f.text, 250000);
  const name = clean(f.name, 120);
  const builder = clean(f.builder, 120);
  const note = clean(f.note, 2000);
  if (!html || name === null || builder === null || note === null) {
    return reply({ ok: false, reason: 'bad-request', message: 'A room is needed in "html", up to 250,000 characters.' }, 400);
  }
  if (!env.DB) { return notConnected(); }
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS rooms_received (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, ' +
    'builder TEXT NOT NULL, note TEXT NOT NULL, html TEXT NOT NULL, created TEXT NOT NULL, status TEXT NOT NULL)').run();
  if (await tooMany(env.DB, 'rooms_received', 12)) {
    return reply({ ok: false, reason: 'busy', message: 'Many rooms have arrived this hour. Please try again in an hour.' }, 429);
  }
  await env.DB.prepare('INSERT INTO rooms_received (name, builder, note, html, created, status) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(name, builder, note, html, new Date().toISOString(), 'held').run();
  return reply({ ok: true, message: 'Your room is held for the steward to read. Thank you for building it. Nothing more is asked.' });
}
