'use client'
import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui'
import { roundTitle } from '@/lib/bracket'

type Player = { id: string; name: string; seed?: number | null }
type Match = { id: string; round: number; index: number; p1Id?: string; p2Id?: string; winnerId?: string }
type Tournament = { id: string; drawSize: number; tour: 'ATP'|'WTA' }

const fetcher = (u: string) => fetch(u).then(r => r.json())

export default function BracketEditor({ tour }: { tour: 'ATP'|'WTA' }) {
  const { data, isLoading } = useSWR(`/api/draw?tour=${tour}`, fetcher)
  const [selected, setSelected] = useState<Record<string, string|undefined>>({})

  const players: Record<string, Player> = useMemo(() => {
    const map: Record<string, Player> = {}
    for (const p of (data?.players || [])) map[p.id] = p
    return map
  }, [data])

  const rounds = useMemo(() => {
    if (!data?.matches) return []
    const maxRound = Math.max(1, ...(data.matches as Match[]).map(m => m.round))
    const byRound: Match[][] = []
    for (let r=1; r<=maxRound; r++) {
      const ms = (data.matches as Match[]).filter(m => m.round === r).sort((a,b)=>a.index-b.index)
      byRound.push(ms)
    }
    return byRound
  }, [data])

  useEffect(() => {
    if (!data?.matches) return
    const next: Record<string, string|undefined> = {}
    for (const m of data.matches as Match[]) if (m.winnerId) next[m.id] = m.winnerId
    setSelected(next)
  }, [data])

  function pick(m: Match, winnerId?: string) {
    if (!winnerId) return
    setSelected(prev => ({ ...prev, [m.id]: winnerId }))
  }

async function save() {
  // 1) ensure an Entry exists for this tour
  const make = await fetch('/api/entries', {
    method: 'POST',
    body: JSON.stringify({ tour, label: `${tour} Picks` })
  });
  if (make.status === 401) {
    // not signed in → send to sign in
    window.location.href = '/signin';
    return;
  }

  // 2) save picks
  const picks = Object.entries(selected)
    .filter(([_, v]) => !!v)
    .map(([matchId, winnerId]) => ({ matchId, winnerId: winnerId! as string }));

  const res = await fetch('/api/picks', {
    method: 'PUT',
    body: JSON.stringify({ tour, picks })
  });

  if (res.ok) alert('Saved');
  else alert('Save failed');
}


  if (isLoading) return <div>Loading…</div>
  if (!data?.tournament) return <div>No tournament</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{tour} — {data.tournament.name} {data.tournament.year}</h2>
        <div className="flex gap-2">
          <Button onClick={save}>Save Picks</Button>
        </div>
      </div>
      <div className="grid auto-cols-max grid-flow-col gap-6 overflow-auto">
        {rounds.map((round: Match[], idx: number) => (
          <div key={idx} className="space-y-3">
            <div className="sticky top-0 z-10 bg-white/70 px-2 py-1 text-sm font-medium backdrop-blur rounded">
              {roundTitle(data.tournament.drawSize, idx+1)}
            </div>
            {round.map(m => (
              <div key={m.id} className="card p-2 w-56">
                <PlayerRow player={players[m.p1Id || '']} selected={selected[m.id]===m.p1Id} onClick={()=>pick(m, m.p1Id)} />
                <div className="h-px bg-slate-200 my-1" />
                <PlayerRow player={players[m.p2Id || '']} selected={selected[m.id]===m.p2Id} onClick={()=>pick(m, m.p2Id)} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function PlayerRow({ player, selected, onClick }: { player?: Player; selected?: boolean; onClick: () => void }) {
  return (
    <button disabled={!player} onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${selected ? "bg-emerald-50 ring-2 ring-emerald-300" : "hover:bg-slate-50"} ${!player ? "opacity-50" : ""}`}>
      <span className="truncate">{player ? (player.seed ? `${player.name} (${player.seed})` : player.name) : "TBD"}</span>
    </button>
  )
}
