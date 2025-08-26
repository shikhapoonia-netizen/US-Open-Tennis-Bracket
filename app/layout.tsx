import './globals.css'
import Link from 'next/link'
import { auth } from '@/lib/auth'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <div className="container py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold">US Open Bracket</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/bracket/atp">ATP</Link>
              <Link href="/bracket/wta">WTA</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/signin">Sign in</Link>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  )
}
