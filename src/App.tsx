import { useEffect, useState } from 'react'
import { api, roleName, type User } from './api.ts'
import { Link, navigate, usePath } from './router.tsx'
import { SignIn } from './pages/SignIn.tsx'
import { Orders } from './pages/Orders.tsx'
import { Order } from './pages/Order.tsx'
import { Products } from './pages/Products.tsx'
import { Customers } from './pages/Customers.tsx'
import { Assistant } from './components/Assistant.tsx'

export function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const path = usePath()

  useEffect(() => {
    api<User>('/me').then(setUser, () => setUser(null))
  }, [])

  if (user === undefined) return null
  if (!user) return <SignIn onSignedIn={(u) => { setUser(u); navigate('/orders') }} />

  const signOut = async () => {
    await api('/session', { method: 'DELETE' })
    setAssistantOpen(false)
    setUser(null)
    navigate('/')
  }

  const orderMatch = path.match(/^\/orders\/(\d+)$/)
  let page = <Orders />
  if (orderMatch) page = <Order number={Number(orderMatch[1])} user={user} />
  else if (path === '/products') page = <Products />
  else if (path === '/customers') page = <Customers user={user} />

  const nav = [
    ['/orders', 'Orders'],
    ['/products', 'Products'],
    ['/customers', 'Customers'],
  ]

  return (
    <div className={assistantOpen ? 'layout with-assistant' : 'layout'}>
      <aside className="sidebar">
        <div className="brand">
          <img src="/favicon.svg" alt="" />
          <span>Stockroom</span>
        </div>
        <div className="shop">{user.shopName}</div>
        <nav>
          {nav.map(([to, label]) => (
            <Link key={to} to={to} className={path.startsWith(to) || (to === '/orders' && path === '/') ? 'active' : ''}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="me">
          <div className="me-name">{user.name}</div>
          <div className="me-role">{roleName[user.role]}</div>
          <button className="link" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        {!assistantOpen && (
          <button className="assistant-toggle" onClick={() => setAssistantOpen(true)}>
            Assistant
          </button>
        )}
        {page}
      </main>
      {assistantOpen && <Assistant key={user.id} user={user} onClose={() => setAssistantOpen(false)} />}
    </div>
  )
}
