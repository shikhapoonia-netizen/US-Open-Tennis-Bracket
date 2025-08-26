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

  const tours = (url.searchParams.getAll('tour') as ('ATP'|'WTA')[])
  const list: ('ATP'|'WTA')[] = tours.length ? tours : ['ATP', 'WTA']
  const src = url.searchParams.get('src') || undefined    // PDF URL
  const txt = url.searchParams.get('txt') || undefined    // Plain-text URL
  const debug = url.searchParams.get('debug') === '1'

  // Debug endpoint so you can see what we fetched without changing the DB
  if (debug) {
    try {
      const useUrl = txt ?? src ?? PDFS[list[0]]
      const r = await fetch(useUrl, {
        cache: 'no-store',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*', 'Referer': 'https://www.usopen.org/' },
      })
      const status = r.status
      const ct = r.headers.get('content-type') || ''
      const buf = Buffer.from(await r.arrayBuffer())
      let sample: string[] = []
      let parseError: string | null = null

      if (/text\//i.test(ct) || useUrl.endsWith('.txt')) {
        sample = buf.toString('utf8').split('\n').slice(0, 60)
      } else {
        try {
          // @ts-ignore - pdf-parse has no types
          const { default: pdfParse } = await import('pdf-parse')
          const data = await pdfParse(buf)
          sample = String(data.text || '').split('\n').slice(0, 60)
        } catch (e: any) {
          parseError = String(e?.message || e)
        }
      }
      return Response.json({ status, contentType: ct, bytes: buf.length, parseError, sample })
    } catch (e: any) {
      return Response.json({ debugError: String(e?.message || e) }, { status: 200 })
    }
  }

  const results = []
  for (const t of list) {
    const res = await seedTournament(t, { src, txt })
    results.push(res)
  }
  return Response.json({ ok: true, results })
}

type Tour = 'ATP' | 'WTA'

const PDFS: Record<Tour, string> = {
  ATP: 'https://www.usopen.org/en_US/scores/draws/2025_MS_draw.pdf',
  WTA: 'https://www.usopen.org/en_US/scores/draws/2025_WS_draw.pdf',
}

async function seedTournament(
  tour: Tour,
  opts: { src?: string; txt?: string } = {},
) {
  const year = 2025
  const slug = tour === 'ATP' ? 'us-open-2025-atp' : 'us-open-2025-wta'

  // Create or fetch the tournament
  const t = await prisma.tournament.upsert({
    where: { slug },
    update: {},
    create: { slug, name: 'US Open', year, tour, drawSize: 128, startAt: new Date(`${year}-08-24T11:00:00-04:00`) },
  })

  // Clear existing data so reseeds are clean
  await prisma.$transaction([
    prisma.match.deleteMany({ where: { tournamentId: t.id } }),
    prisma.player.deleteMany({ where: { tournamentId: t.id } }),
  ])

  let pairs: Pair[] = []
  let sourceUsed: 'txt' | 'pdf' | 'fallback' = 'fallback'

  // Prefer TXT if provided, else PDF, else fallback
  if (opts.txt) {
    const text = await fetchText(opts.txt)
    pairs = parsePlainTextList(text)
    sourceUsed = 'txt'
  } else if (opts.src || PDFS[tour]) {
    try {
      const pdfUrl = opts.src ?? PDFS[tour]
      const buf = await fetchPdf(pdfUrl)
      const text = await pdfToText(buf)
      pairs = parseRoundOne(text)
      sourceUsed = 'pdf'
    } catch {
      pairs = generateDummyPairs(tour)
      sourceUsed = 'fallback'
    }
  }

  // Create players (deduped by name)
  const playerMap = new Map<string, string>()
  for (const [p1, p2] of pairs) {
    for (const p of [p1, p2]) {
      if (!playerMap.has(p.name)) {
        const created = await prisma.player.create({
          data: { name: p.name, seed: p.seed ?? undefined, tournamentId: t.id },
        })
        playerMap.set(p.name, created.id)
      }
    }
  }

  // Round 1 matches
  const m1: any[] = []
  for (let i = 0; i < pairs.length; i++) {
    const [a, b] = pairs[i]
    m1.push(prisma.match.create({
      data: {
        tournamentId: t.id,
        round: 1,
        index: i,
        p1Id: playerMap.get(a.name)!,
        p2Id: playerMap.get(b.name)!,
      },
    }))
  }
  await prisma.$transaction(m1)

  // Pre-create later rounds
  const drawSize = 128
  const maxRound = Math.log2(drawSize)
  const later: any[] = []
  for (let r = 2; r <= maxRound; r++) {
    const count = drawSize / Math.pow(2, r)
    for (let i = 0; i < count; i++) {
      later.push(prisma.match.create({ data: { tournamentId: t.id, round: r, index: i } }))
    }
  }
  await prisma.$transaction(later)

  return {
    tour,
    sourceUsed,
    playersCreated: playerMap.size,
    round1Matches: pairs.length,
  }
}

// ---------- helpers ----------

async function fetchPdf(url: string) {
  const res = await fetch(url, {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/pdf,*/*;q=0.9',
      'Referer': 'https://www.usopen.org/',
    },
  })
  if (!res.ok) throw new Error(`fetch ${res.status}`)
  const ct = res.headers.get('content-type') || ''
  if (!/pdf/i.test(ct)) throw new Error(`bad content-type: ${ct}`)
  return Buffer.from(await res.arrayBuffer())
}

async function fetchText(url: string) {
  const res = await fetch(url, { cache: 'no-store', redirect: 'follow' })
  if (!res.ok) throw new Error(`fetch text ${res.status}`)
  return await res.text()
}

async function pdfToText(buf: Buffer) {
  // @ts-ignore - pdf-parse has no types
  const { default: pdfParse } = await import('pdf-parse')
  const data = await pdfParse(buf)
  return String(data.text || '')
}

type ParsedPlayer = { name: string; seed?: number | null }
type Pair = [ParsedPlayer, ParsedPlayer]

// TXT format: 128 lines — accepts “1. Name [1]”, “Name (1)”, or just “Name”
function parsePlainTextList(text: string): Pair[] {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 128)

  if (lines.length < 128) throw new Error(`need 128 names, got ${lines.length}`)

  const entries = lines.map((l) => {
    // drop leading numbering like "1. " or "001 "
    let s = l.replace(/^\s*\d{1,3}[.)]?\s+/, '')
    // seed like [1] or (1)
    let seed: number | undefined
    const m = s.match(/\[(\d+)\]|\((\d+)\)/)
    if (m) {
      seed = parseInt(m[1] || m[2]!, 10)
      s = s.replace(/\s*(\[(\d+)\]|\((\d+)\))\s*/, '').trim()
    }
    return { name: s, seed }
  })

  const pairs: Pair[] = []
  for (let i = 0; i < 128; i += 2) pairs.push([entries[i], entries[i + 1]])
  return pairs
}

// Very basic PDF text parser (kept for completeness)
function parseRoundOne(text: string): Pair[] {
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  // Example style: "1. Novak Djokovic [1]" … etc.
  const numbered = lines.filter((l) => /^\d+\.\s+/.test(l))
  const entries = numbered.map((l) => {
    const m = l.match(/^\d+\.\s+(.*)$/)
    let name = (m?.[1] || '').trim()
    let seed: number | undefined
    const ms = name.match(/\[(\d+)\]/) || name.match(/\((\d+)\)/)
    if (ms) {
      seed = parseInt(ms[1] || ms[2]!, 10)
      name = name.replace(/\s*(\[(\d+)\]|\((\d+)\))\s*/, '').trim()
    }
    // strip qualifiers tags
    name = name.replace(/\s*\b(Q|WC|LL)\b\s*/g, '').trim()
    return { name, seed }
  })
  const first128 = entries.slice(0, 128)
  if (first128.length < 128) throw new Error(`Only found ${first128.length} entries in Round 1`)
  const pairs: Pair[] = []
  for (let i = 0; i < first128.length; i += 2) pairs.push([first128[i], first128[i + 1]])
  return pairs
}

// Fallback: placeholder names if parsing fails
function generateDummyPairs(tour: Tour): Pair[] {
  const entries: ParsedPlayer[] = Array.from({ length: 128 }, (_, i) => ({
    name: `${tour} Player ${i + 1}`,
    seed: i < 32 ? i + 1 : undefined,
  }))
  const pairs: Pair[] = []
  for (let i = 0; i < 128; i += 2) pairs.push([entries[i], entries[i + 1]])
  return pairs
}


