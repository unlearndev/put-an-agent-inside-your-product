import { useEffect, useState } from 'react'
import { api, type Customer, type User } from '../api.ts'

export function Customers({ user }: { user: User }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    api<Customer[]>('/customers').then(setCustomers, (e) => setError(e.message))
  }, [user.id])

  return (
    <>
      <header className="page-header">
        <h1>Customers</h1>
      </header>
      {error ? (
        <div className="empty">{error}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td className="muted">{c.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
