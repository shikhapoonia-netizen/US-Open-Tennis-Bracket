export const DEFAULT_POINTS = [10, 20, 30, 50, 80, 120, 200]; // R1..F
export function scorePicks(args: {
  picks: { matchId: string; winnerId: string }[];
  results: { matchId: string; winnerId: string; round: number }[];
  pointsPerRound?: number[];
}) {
  const { picks, results, pointsPerRound = DEFAULT_POINTS } = args;
  const map = new Map(results.map(r => [r.matchId, r]));
  let total = 0;
  const byRound: Record<number, number> = {};
  for (const p of picks) {
    const r = map.get(p.matchId);
    if (!r) continue;
    const correct = r.winnerId === p.winnerId;
    const pts = correct ? (pointsPerRound[r.round - 1] || 0) : 0;
    total += pts;
    byRound[r.round] = (byRound[r.round] || 0) + pts;
  }
  return { total, byRound };
}
