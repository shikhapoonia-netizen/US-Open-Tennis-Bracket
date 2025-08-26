import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { tour, picks } = body as { tour: 'ATP'|'WTA', picks: { matchId: string, winnerId: string }[] }
  const slug = tour === 'ATP' ? 'us-open-2025-atp' : 'us-open-2025-wta'
  const t = await prisma.tournament.findFirst({ where: { slug } })
  if (!t) return Response.json({ error: 'Tournament not found' }, { status: 404 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } })
  const entry = await prisma.entry.findUnique({ where: { userId_tournamentId: { userId: user!.id, tournamentId: t.id } } })
  if (!entry) return Response.json({ error: 'Entry not found' }, { status: 404 })

  await prisma.$transaction([
    prisma.pick.deleteMany({ where: { entryId: entry.id }}),
    prisma.pick.createMany({ data: picks.map(p => ({ ...p, entryId: entry.id })) })
  ])
  return Response.json({ ok: true })
}
