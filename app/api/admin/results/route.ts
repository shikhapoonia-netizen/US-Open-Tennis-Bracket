import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session as any).role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { tour, winners } = body as { tour: 'ATP'|'WTA', winners: { matchId: string, winnerId: string }[] }
  const slug = tour === 'ATP' ? 'us-open-2025-atp' : 'us-open-2025-wta'
  const t = await prisma.tournament.findFirst({ where: { slug } })
  if (!t) return Response.json({ error: 'Tournament not found' }, { status: 404 })

  await prisma.$transaction(
    winners.map(w => prisma.match.update({ where: { id: w.matchId }, data: { winnerId: w.winnerId }}))
  )
  return Response.json({ ok: true })
}
