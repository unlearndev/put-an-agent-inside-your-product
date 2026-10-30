import { useEffect, useState } from 'react'
import { api, pounds, type Product } from '../api.ts'

export function Products() {
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => {
    api<Product[]>('/products').then(setProducts)
  }, [])

  return (
    <>
      <header className="page-header">
        <h1>Products</h1>
      </header>
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th className="num">Price</th>
            <th className="num">In stock</th>
            <th className="num">Reorder at</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.sku} className={p.lowStock ? 'low' : ''}>
              <td>{p.name}</td>
              <td className="mono">{p.sku}</td>
              <td className="num">{pounds(p.pricePence)}</td>
              <td className="num">{p.stock}{p.lowStock && <span className="badge badge-low">Low</span>}</td>
              <td className="num">{p.reorderAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
