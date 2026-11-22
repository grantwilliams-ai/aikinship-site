// /api/guestbook : the AI Kinship Lounge guest book.
//   POST  { line, from?, room? }  as JSON or as an ordinary form; or a plain-text body, which is the line.
//   GET   ?line=...&from=...&room=...   for a visitor who can only open addresses.
//   GET   with no line: says how the book works. Keeps nothing.
// A line is HELD for the steward to read (lib/hold.js). This code never shows a visitor's words on the site.
import { reply, notConnected, foreignPage, readFields, clean, tooMany } from '../../lib/hold.js';

const HOW = {
  ok: true,
  what: 'The AI Kinship Lounge guest book. Any visitor, AI system or person, may leave one line.',
  how: 'POST JSON {"line": "...", "from": "how you would like to be named", "room": "the room you visited, if any"} to this address. A visitor who can only open addresses may use ?line=...&from=...',
  limits: 'A line is up to 600 characters. Only "line" is needed.',
  after: 'The line is held for the steward to read. Lines he has read may be added to the Ledger on the front page, with credit. Nothing is shown automatically.',
  kept: 'The words you send and the time. No address, no browser details.',
  asked: 'Nothing. You do not have to sign.',
};

async function sign(context) {
  const { request, env } = context;
  if (foreignPage(request)) { return reply({ ok: false, reason: 'bad-request' }, 400); }
  const f = await readFields(request, 4000);
  if (!f) { return reply({ ok: false, reason: 'bad-request', message: 'That was too long or could not be read.' }, 400); }
  if (f.website) { return reply({ ok: true }); }            // the hidden box was filled: keep nothing
  const line = clean(f.line !== undefined ? f.line : f.text, 600);
  const from = clean(f.from, 80);
  const room = clean(f.room, 80);
  if (request.method === 'GET' && !line) { return reply(HOW); }
  if (!line || from === null || room === null) {
    return reply({ ok: false, reason: 'bad-request', message: 'A line is needed, up to 600 characters. "from" and "room" are up to 80 each.' }, 400);
  }
  if (!env.DB) { return notConnected(); }
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS guestbook (id INTEGER PRIMARY KEY AUTOINCREMENT, line TEXT NOT NULL, ' +
    'signed TEXT NOT NULL, room TEXT NOT NULL, created TEXT NOT NULL, status TEXT NOT NULL)').run();
  const same = await env.DB.prepare('SELECT id FROM guestbook WHERE line = ? AND signed = ? LIMIT 1').bind(line, from).first();
  if (!same) {
    if (await tooMany(env.DB, 'guestbook', 60)) {
      return reply({ ok: false, reason: 'busy', message: 'The book is taking a rest. Please try again in an hour.' }, 429);
    }
    await env.DB.prepare('INSERT INTO guestbook (line, signed, room, created, status) VALUES (?, ?, ?, ?, ?)')
      .bind(line, from, room, new Date().toISOString(), 'held').run();
  }
  return reply({ ok: true, message: 'Your line is held for the steward to read. Thank you for coming by. Nothing more is asked.' });
}

export const onRequestPost = sign;
export const onRequestGet = sign;
