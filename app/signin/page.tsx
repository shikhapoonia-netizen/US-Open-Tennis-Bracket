'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Input, Button } from '@/components/ui'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  return (
    <div className="max-w-sm mx-auto card p-6 space-y-3">
      <h1 className="text-xl font-semibold">Demo Sign In</h1>
      <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      <Button onClick={() => signIn('credentials', { email, name, callbackUrl: '/' })}>Sign In</Button>
    </div>
  )
}
