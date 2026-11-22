# functions/

Cloudflare Pages Functions for aikinship.org. Cloudflare serves `site/` as the pages and runs the files here
beside them. `lib/hold.js` (beside this folder) holds what they share.

| File | For | Switched on by |
|---|---|---|
| `api/guestbook.js` | The guest book: one line from any visitor. | a D1 database bound as `DB` |
| `api/room.js` | A room sent back in answer to `/build-a-room/`. | the same `DB` |

Both answer "not connected" (501) and keep nothing until the database is attached.
Attached 2026-11-22: D1 database `aikinship-guestbook`, bound as `DB`.
Everything sent is held for the steward to read. Nothing a visitor sends is shown on the site by this code.
Kept: the words sent and the time. No IP address and no browser details.

Reading what has arrived (Cloudflare dashboard, the database's Console):
`SELECT id, created, signed, room, line FROM guestbook ORDER BY id DESC;`
`SELECT id, created, name, builder, note, length(html) FROM rooms_received ORDER BY id DESC;`
