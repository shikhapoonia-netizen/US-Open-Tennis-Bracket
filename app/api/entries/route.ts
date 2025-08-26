import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { tour, label } = body as { tour: 'ATP'|'WTA', label?: string }
  const slug = tour === 'ATP' ? 'us-open-2025-atp' : 'us-open-2025-wta'
  const t = await prisma.tournament.findFirst({ where: { slug } })
  if (!t) return Response.json({ error: 'Tournament not found' }, { status: 404 })
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } })
  const entry = await prisma.entry.upsert({
    where: { userId_tournamentId: { userId: user!.id, tournamentId: t.id } },
    create: { userId: user!.id, tournamentId: t.id, label: label || `${session.user.name || 'My'} Picks (${tour})` },
    update: { label: label || `${session.user.name || 'My'} Picks (${tour})` }
  })
  return Response.json({ entry })
}
