import Link from 'next/link'

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">US Open Bracket — 2025</h1>
      <p className="text-slate-600">Pick winners across ATP/WTA draws, share your bracket, and score as results come in.</p>
      <div className="flex gap-3">
        <Link href="/bracket/atp" className="btn btn-primary">Open ATP Bracket</Link>
        <Link href="/bracket/wta" className="btn">Open WTA Bracket</Link>
      </div>
    </div>
  )
}
