import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const tour = (req.nextUrl.searchParams.get('tour') || 'ATP').toUpperCase() as 'ATP'|'WTA'
  const slug = tour === 'ATP' ? 'us-open-2025-atp' : 'us-open-2025-wta'
  const t = await prisma.tournament.findFirst({ where: { slug } })
  if (!t) return Response.json({ error: 'Tournament not found' }, { status: 404 })
  const players = await prisma.player.findMany({ where: { tournamentId: t.id } })
  const matches = await prisma.match.findMany({ where: { tournamentId: t.id } })
  return Response.json({ tournament: t, players, matches })
}
