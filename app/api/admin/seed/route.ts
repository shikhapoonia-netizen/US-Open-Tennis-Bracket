import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SEED_TOKEN = process.env.SEED_TOKEN as string | undefined

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') || ''
  if (!SEED_TOKEN || token !== SEED_TOKEN) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }
  try {
    const tours = (url.searchParams.getAll('tour') as ('ATP'|'WTA')[])
    const list: ('ATP'|'WTA')[] = tours.length ? tours : ['ATP','WTA']
    for (const t of list) await seedTournament(t)
    return Response.json({ ok: true })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 })
  }
}

type Tour = 'ATP'|'WTA'
const PDFS: Record<Tour,string> = {
  ATP: 'https://www.usopen.org/en_US/scores/draws/2025_MS_draw.pdf',
  WTA: 'https://www.usopen.org/en_US/scores/draws/2025_WS_draw.pdf'
}

async function seedTournament(tour: Tour) {
  const pdfUrl = PDFS[tour]
  const buf = await fetchPdf(pdfUrl)
  const text = await pdfToText(buf)
  const pairs = parseRoundOne(text)
  const year = 2025
  const slug = tour === 'ATP' ? 'us-open-2025-atp' : 'us-open-2025-wta'

  const t = await prisma.tournament.upsert({
    where: { slug },
    update: {},
    create: { slug, name: 'US Open', year, tour, drawSize: 128, startAt: new Date(`${year}-08-24T11:00:00-04:00`) }
  })

  const playerMap = new Map<string, string>()
  for (const [p1, p2] of pairs) {
    for (const p of [p1, p2]) {
      if (!playerMap.has(p.name)) {
        const created = await prisma.player.create({ data: { name: p.name, seed: p.seed || undefined, tournamentId: t.id } })
        playerMap.set(p.name, created.id)
      }
    }
  }

  const m1: any[] = []
  for (let i=0; i<pairs.length; i++) {
    const [a, b] = pairs[i]
    const p1Id = playerMap.get(a.name)!
    const p2Id = playerMap.get(b.name)!
    m1.push(prisma.match.create({ data: { tournamentId: t.id, round: 1, index: i, p1Id, p2Id }}))
  }
  await prisma.$transaction(m1)

  const drawSize = 128
  const maxRound = Math.log2(drawSize)
  const later: any[] = []
  for (let r=2; r<=maxRound; r++) {
    const count = drawSize / Math.pow(2, r)
    for (let i=0; i<count; i++) {
      later.push(prisma.match.create({ data: { tournamentId: t.id, round: r, index: i }}))
    }
  }
  await prisma.$transaction(later)
}

// helpers
async function fetchPdf(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download PDF: ${url}`)
  return Buffer.from(await res.arrayBuffer())
}
async function pdfToText(buf: Buffer) {
  const { default: pdfParse } = await import('pdf-parse')
  const data = await pdfParse(buf)
  return data.text || ''
}
type ParsedPlayer = { name: string; seed?: number | null }
type Pair = [ParsedPlayer, ParsedPlayer]
function parseRoundOne(text: string): Pair[] {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  const numbered = lines.filter(l => /^\d+\.\s+/.test(l))
  const entries = numbered.map(l => {
    const m = l.match(/^(\d+)\.\s+(.*)$/)
    let namePart = (m?.[2] || '').trim()
    let seed: number | null = null
    const ms = namePart.match(/\[(\d+)\]/)
    if (ms) { seed = parseInt(ms[1], 10); namePart = namePart.replace(/\s*\[\d+\]\s*/, '').trim() }
    namePart = namePart.replace(/\s*\((Q|W|L)\)/g, '').trim()
    return { name: namePart, seed: seed ?? undefined }
  })
  const first128 = entries.slice(0, 128)
  if (first128.length < 128) throw new Error(`Only found ${first128.length} entries in Round 1`)
  const pairs: Pair[] = []
  for (let i=0; i<first128.length; i+=2) pairs.push([first128[i], first128[i+1]])
  return pairs
}
