/*
  Seed script: downloads official 2025 US Open ATP/WTA draw PDFs from usopen.org,
  parses Round 1 numbered entries, creates players and matches, and stubs later rounds.
  URLs are embedded below and fetched when you run `pnpm db:seed`.
*/
import fs from 'node:fs'
import pdf from 'pdf-parse'
import { PrismaClient, Tour } from '@prisma/client'

const prisma = new PrismaClient()

const PDFS = {
  ATP: 'https://www.usopen.org/en_US/scores/draws/2025_MS_draw.pdf',
  WTA: 'https://www.usopen.org/en_US/scores/draws/2025_WS_draw.pdf'
}

async function fetchPdf(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download PDF: ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  return buf
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
    if (ms) {
      seed = parseInt(ms[1], 10)
      namePart = namePart.replace(/\s*\[\d+\]\s*/, '').trim()
    }
    namePart = namePart.replace(/\s*\((Q|W|L)\)/g, '').trim()
    return { name: namePart, seed }
  })
  if (entries.length < 128) {
    if (entries.length >= 64) {
      console.warn(`Warning: only found ${entries.length} entries; proceeding with first 128 or first 64 pairs`)
    } else {
      throw new Error(`Could not parse enough Round 1 lines (found ${entries.length})`)
    }
  }
  const first128 = entries.slice(0, 128)
  const pairs: Pair[] = []
  for (let i=0; i<first128.length; i+=2) {
    pairs.push([first128[i], first128[i+1]])
  }
  return pairs
}

async function seedTournament(tour: Tour, pdfUrl: string) {
  console.log(`Seeding ${tour} from ${pdfUrl}`)
  const buf = await fetchPdf(pdfUrl)
  const data = await pdf(buf)
  const text = data.text
  const pairs = parseRoundOne(text)
  const year = 2025
  const slug = tour === 'ATP' ? 'us-open-2025-atp' : 'us-open-2025-wta'

  const t = await prisma.tournament.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: 'US Open',
      year,
      tour,
      drawSize: 128,
      startAt: new Date(`${year}-08-24T11:00:00-04:00`)
    }
  })

  const playerMap = new Map<string, string>()
  for (const [p1, p2] of pairs) {
    for (const p of [p1, p2]) {
      const created = await prisma.player.create({
        data: { name: p.name, seed: p.seed || undefined, tournamentId: t.id }
      })
      playerMap.set(p.name, created.id)
    }
  }

  const m1 = []
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

  console.log(`Seeded ${tour}: ${pairs.length*2} players, ${drawSize-1} matches`)
}

async function main() {
  await seedTournament('ATP', PDFS.ATP)
  await seedTournament('WTA', PDFS.WTA)
}
main().catch(e => { console.error(e); process.exit(1) }).finally(()=> prisma.$disconnect())
