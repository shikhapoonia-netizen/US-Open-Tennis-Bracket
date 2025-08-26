import BracketEditor from '@/components/BracketEditor'

export default function Page({ params }: { params: { tour: 'atp'|'wta' }}) {
  const t = params.tour.toUpperCase() === 'ATP' ? 'ATP' : 'WTA'
  return <BracketEditor tour={t as 'ATP'|'WTA'} />
}
