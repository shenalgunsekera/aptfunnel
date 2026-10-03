# ThatPokerAgent: meeting booking

| Page      | URL      | What it does                                                 |
| --------- | -------- | ------------------------------------------------------------ |
| Voice call | `/`      | Player picks a slot, enters name, ClubGG name, email, Discord/Telegram handle |
| Text chat | `/text`  | Same flow, for a text meeting                                  |
| Admin     | `/admin` | Bookings list, schedule view (block slots, close days), weekly hours and rules |

Both meeting types share one calendar. A slot can only ever be booked once: the database enforces it, so two players clicking the same time at the same moment can't both get it.

## Run locally

```bash
npm install
cp .env.example .env.local   # then set ADMIN_PASSWORD
npm run dev
```

No database setup is needed locally. With no `DATABASE_URL`, the app uses an embedded Postgres stored in `./.data`.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel.
2. In the Vercel project, open **Storage → Create Database → Neon (Postgres)** and connect it to the project. This sets `DATABASE_URL` for you. The free tier is plenty.
3. In **Settings → Environment Variables**, add `ADMIN_PASSWORD` (make it long).
4. Optional: add `DISCORD_WEBHOOK_URL` (Discord channel → Edit → Integrations → Webhooks) to get a ping for every new booking.
5. Deploy. Tables are created automatically on the first request.
6. Open `/admin`, go to **Availability**, set your timezone and weekly hours, and save.
