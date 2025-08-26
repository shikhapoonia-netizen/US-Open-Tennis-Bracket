import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export default async function AdminPage() {
  const session = await auth()
  const role = (session as any)?.role || 'USER'
  const isAdmin = role === 'ADMIN'
  const tATP = await prisma.tournament.findFirst({ where: { slug: 'us-open-2025-atp' } })
  const tWTA = await prisma.tournament.findFirst({ where: { slug: 'us-open-2025-wta' } })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      {!isAdmin && <p className="text-red-600">You are not an admin. Set your role to ADMIN in DB to use this page.</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold mb-2">ATP Tournament</h2>
          <pre className="text-xs bg-slate-50 p-2 rounded">{JSON.stringify(tATP, null, 2)}</pre>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-2">WTA Tournament</h2>
          <pre className="text-xs bg-slate-50 p-2 rounded">{JSON.stringify(tWTA, null, 2)}</pre>
        </div>
      </div>
      <p className="text-sm text-slate-600">Use API <code>/api/admin/results</code> to POST winners. Build a nicer UI later.</p>
    </div>
  )
}
