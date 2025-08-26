export type Player = { id: string; name: string; seed?: number | null; tour: 'ATP'|'WTA' };
export type Match = { id: string; round: number; index: number; p1Id?: string; p2Id?: string; winnerId?: string };
export type Picks = Record<string, string | undefined>;

export function roundsCount(drawSize: number) {
  return Math.log2(drawSize);
}

export function roundTitle(drawSize: number, round: number) {
  const rCount = roundsCount(drawSize);
  const left = Math.pow(2, rCount - round);
  if (left >= 64) return `Round of ${left}`;
  if (left === 32) return 'Round of 32';
  if (left === 16) return 'Round of 16';
  if (left === 8) return 'Quarterfinals';
  if (left === 4) return 'Semifinals';
  if (left === 2) return 'Final';
  return `Round ${round}`;
}
