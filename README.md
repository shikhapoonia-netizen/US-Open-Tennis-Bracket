# US Open Bracket — Next.js + Prisma + NextAuth (Vercel Ready)

Next.js 14 + Tailwind + Prisma + NextAuth app for a Served-style US Open bracket editor.

## Local Dev

```bash
pnpm i
cp .env.example .env
pnpm db:push        # creates schema against your Postgres (or skip and rely on migration deploy)
pnpm db:seed        # downloads 2025 PDF draws from usopen.org and seeds ATP & WTA
pnpm dev
```

Visit http://localhost:3000 — sign in at `/signin` (demo credentials).

## Deploy to Vercel (Postgres + automatic migrations)

1. Create a Postgres DB (Neon/Supabase/Vercel Postgres) and copy the connection string.
2. Push this repo and import into Vercel.
3. Set Environment Variables:
   - `DATABASE_URL` — your Postgres URL (include `sslmode=require` if needed)
   - `NEXTAUTH_SECRET` — a long random string
   - `NEXTAUTH_URL` — your production URL (Vercel sets this automatically after first deploy)
4. Deploy. Build runs:
   ```
   prisma generate && prisma migrate deploy && next build
   ```

### Seed data (ATP & WTA)

Run once after deploy (or locally pointing to prod DB):

```bash
pnpm db:seed
```

## Slugs & Routes

- Tournaments: `us-open-2025-atp`, `us-open-2025-wta`
- Brackets: `/bracket/atp`, `/bracket/wta`
- Admin: `/admin` (set your `User.role = 'ADMIN'`)

## Notes

- Parser in `prisma/seed.ts` is light; if the USTA changes the PDF format, adjust `parseRoundOne`.
- For production OAuth, add providers in `lib/auth.ts`.
