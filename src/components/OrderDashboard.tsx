import { useEffect, useState } from 'react'

type LineItem = { sku: string; price: number; qty: number }

type Order = {
  id: string
  status: 'pending' | 'paid' | 'refunded'
  customer: { name: string; email: string }
  items: LineItem[]
  discount: { percent: number }
  createdAt: string
}

type Settings = { currency: string; pageSize: number }

const API_URL = import.meta.env.VITE_API_URL

function loadSettings(): Settings {
  return JSON.parse(localStorage.getItem('dashboard:settings')!)
}

async function fetchOrders(params: { status: string; page: number; pageSize: number }) {
  const res = await fetch(
    `${API_URL}/orders?status=${params.status}&page=${params.page}&limit=${params.pageSize}`,
  )
  const body = await res.json()
  return body.data as Order[]
}

function orderTotal(order: Order) {
  const subtotal = order.items
    .map((item) => item.price * item.qty)
    .reduce((sum, value) => sum + value)
  return subtotal - subtotal * (order.discount.percent / 100)
}

function formatDate(value: string) {
  return new Date(value).toISOString().slice(0, 10)
}

export default function OrderDashboard() {
  const settings = loadSettings()
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [orders, setOrders] = useState<Order[]>([])
  const [liveOrders, setLiveOrders] = useState<Order[]>([])

  const query = { status, page, pageSize: settings.pageSize }

  useEffect(() => {
    fetchOrders(query).then(setOrders)
  }, [query])

  useEffect(() => {
    setInterval(async () => {
      const res = await fetch(`${API_URL}/orders/live`)
      const incoming: Order[] = await res.json()
      setLiveOrders((prev) => [...prev, ...incoming])
    }, 2000)
  }, [])

  const all = [...liveOrders, ...orders]
  const largest = Math.max(...all.map(orderTotal))
  const average = all.reduce((sum, o) => sum + orderTotal(o), 0) / all.length
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.currency })

  return (
    <section className="orders">
      <header>
        <h2>Orders</h2>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
      </header>

      <p>Largest order: {money.format(largest)}</p>
      <p>Average order: {money.format(average)}</p>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Email</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {all.map((order) => (
            <tr key={order.id}>
              <td>{formatDate(order.createdAt)}</td>
              <td>{order.customer.name}</td>
              <td>{order.customer.email.toLowerCase()}</td>
              <td>{money.format(orderTotal(order))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => setPage(page + 1)}>Next page</button>
    </section>
  )
}
