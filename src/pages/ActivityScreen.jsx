import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

const catEmojis = { Food:'🍔', Transport:'🚗', Bills:'📱',
  Entertainment:'🎬', Health:'💊', Shopping:'🛍',
  Savings:'💰', Income:'💵', Other:'⚡', Cash:'💵',
  Airtime:'📡', Banking:'🏦' }

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(dateStr).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
}

function groupByDate(txs) {
  const groups = {}
  txs.forEach(tx => {
    const d = new Date(tx.date)
    const today = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
    const txDay = new Date(d); txDay.setHours(0,0,0,0)
    let key
    if (txDay.getTime() === today.getTime()) key = 'Today'
    else if (txDay.getTime() === yesterday.getTime()) key = 'Yesterday'
    else key = d.toLocaleDateString('en-KE', { month: 'long', day: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  })
  return groups
}

export default function ActivityScreen() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      let q = supabase.from('transactions').select('*')
        .eq('user_id', user.id).order('date', { ascending: false }).limit(100)
      if (filter === 'income') q = q.eq('type', 'income')
      if (filter === 'expense') q = q.eq('type', 'expense')
      const { data } = await q
      setTransactions(data || [])
      setLoading(false)
    }
    load()
  }, [user, filter])

  const filtered = search
    ? transactions.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()))
    : transactions

  const grouped = groupByDate(filtered)

  const totals = transactions.reduce((a, t) => {
    if (t.amount > 0) a.income += t.amount
    else a.expense += Math.abs(t.amount)
    return a
  }, { income: 0, expense: 0 })

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '100px' }}>
      <div style={{ padding: '56px 24px 16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px' }}>Activity</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginTop: '4px' }}>
          All your transactions in one place.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '10px', padding: '0 24px 16px' }}>
        {[
          { label: 'Income', val: totals.income, positive: true },
          { label: 'Expenses', val: totals.expense, positive: false }
        ].map(s => (
          <div key={s.label} className="glass" style={{ flex: 1, padding: '14px 16px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)',
              fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
              marginBottom: '4px' }}>{s.label}</p>
            <p style={{ fontSize: '18px', fontWeight: 800,
              color: s.positive ? '#FFF' : 'rgba(255,255,255,0.7)' }}>
              KES {s.val.toLocaleString('en-KE')}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '0 24px 12px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '40px', top: '50%',
          transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)',
          fontSize: '16px' }}>🔍</span>
        <input className="input" placeholder="Search transactions..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '44px' }} />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 24px 16px',
        overflowX: 'auto' }}>
        {['all','income','expense'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="btn"
            style={{
              height: '34px', padding: '0 16px', borderRadius: '20px',
              fontSize: '13px', fontWeight: 600, flexShrink: 0,
              background: filter === f ? '#FFF' : 'rgba(255,255,255,0.06)',
              color: filter === f ? '#000' : '#FFF',
              border: filter === f ? 'none' : '1px solid rgba(255,255,255,0.1)',
              textTransform: 'capitalize'
            }}>{f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expenses'}</button>
        ))}
      </div>

      {/* Transaction list */}
      {loading ? (
        <div style={{ padding: '0 24px' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="shimmer" style={{ height: '60px', marginBottom: '8px' }} />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px',
          color: 'rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📭</div>
          <p style={{ fontWeight: 600, marginBottom: '8px' }}>No transactions yet</p>
          <p style={{ fontSize: '14px', lineHeight: 1.6 }}>
            Add your first transaction or import<br />your M-Pesa SMS to get started.
          </p>
        </div>
      ) : Object.entries(grouped).map(([date, txs]) => (
        <div key={date}>
          <div style={{ padding: '8px 24px',
            position: 'sticky', top: 0, background: '#0A0A0A', zIndex: 10 }}>
            <p style={{ fontSize: '12px', fontWeight: 700,
              color: 'rgba(255,255,255,0.35)', letterSpacing: '1px',
              textTransform: 'uppercase' }}>{date}</p>
          </div>
          {txs.map((tx, i) => (
            <div key={tx.id} className={`stagger-${Math.min(i+1,5)}`}
              style={{ display: 'flex', alignItems: 'center',
                padding: '12px 24px', gap: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0 }}>
                {catEmojis[tx.category] || '⚡'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '15px', fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.name}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  {tx.category} · {relativeTime(tx.date)}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '15px', fontWeight: 700,
                  color: tx.amount > 0 ? '#FFF' : 'rgba(255,255,255,0.65)' }}>
                  {tx.amount > 0 ? '+' : '-'}KES {Math.abs(tx.amount).toLocaleString('en-KE')}
                </p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
