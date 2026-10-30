import { useState } from 'react'
import { api, type User } from '../api.ts'

const DEMO_ACCOUNTS = [
  ['tom@larkspur.test', 'Tom Reid', 'Support, Larkspur Ceramics'],
  ['priya@larkspur.test', 'Priya Nair', 'Warehouse, Larkspur Ceramics'],
  ['nadia@larkspur.test', 'Nadia Ellis', 'Owner, Larkspur Ceramics'],
  ['owen@hollowoak.test', 'Owen Hart', 'Owner, Hollow Oak Candles'],
]

export function SignIn({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const signIn = async (email: string, password: string) => {
    try {
      onSignedIn(await api<User>('/session', { method: 'POST', body: JSON.stringify({ email, password }) }))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="signin">
      <form
        className="card signin-card"
        onSubmit={(e) => {
          e.preventDefault()
          signIn(email, password)
        }}
      >
        <div className="brand">
          <img src="/favicon.svg" alt="" />
          <span>Stockroom</span>
        </div>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary">Sign in</button>
        <div className="demo-accounts">
          <p>Demo accounts</p>
          {DEMO_ACCOUNTS.map(([email, name, role]) => (
            <button type="button" key={email} className="demo-account" onClick={() => signIn(email, 'stockroom')}>
              <strong>{name}</strong>
              <span>{role}</span>
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}
