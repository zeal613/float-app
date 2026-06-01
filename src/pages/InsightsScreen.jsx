import { useFloat } from '../hooks/useFloat'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, LineChart, Line } from 'recharts'

const GRAYS = ['#FFFFFF','#CCCCCC','#999999','#666666','#444444']

export default function InsightsScreen() {
  const { recentTransactions, floatHistory, calmScore, totalBalance,
    totalBillsDue, floatAmount, isLoading } = useFloat()

  const expenses = recentTransactions.filter(t => t.amount < 0)
  const income = recentTransactions.filter(t => t.amount > 0)

  // Category breakdown
  const catData = Object.entries(
    expenses.reduce((a, t) => {
      a[t.category] = (a[t.category] || 0) + Math.abs(t.amount)
      return a
    }, {})
  ).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  const totalSpent = expenses.reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalIncome = income.reduce((s, t) => s + t.amount, 0)

  // Daily spending last 14 days
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    const dayStr = d.toLocaleDateString('en-KE', { weekday: 'short' })
    const dayExpenses = expenses.filter(t => {
      const td = new Date(t.date)
      return td.toDateString() === d.toDateString()
    }).reduce((s, t) => s + Math.abs(t.amount), 0)
    return { day: dayStr, amount: dayExpenses }
  })

  // Float history chart
  const floatChartData = floatHistory.map((v, i) => ({
    day: `D${i+1}`, float: v
  }))

  if (isLoading) return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', padding: '56px 24px' }}>
      {[1,2,3].map(i => (
        <div key={i} className="shimmer" style={{ height: '180px', marginBottom: '16px' }} />
      ))}
    </div>
  )

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh',
      paddingBottom: '100px' }}>
      <div style={{ padding: '56px 24px 16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px' }}>Insights</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginTop: '4px' }}>
          Your financial picture.
        </p>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { label: 'Total Income', val: totalIncome, icon: '📈' },
            { label: 'Total Spent', val: totalSpent, icon: '📉' },
            { label: 'Balance', val: totalBalance, icon: '💳' },
            { label: 'Float Today', val: floatAmount, icon: '🌊' },
          ].map(s => (
            <div key={s.label} className="glass" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                marginBottom: '6px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)',
                  fontWeight: 700, letterSpacing: '1px',
                  textTransform: 'uppercase' }}>{s.label}</p>
                <span style={{ fontSize: '16px' }}>{s.icon}</span>
              </div>
              <p style={{ fontSize: '18px', fontWeight: 800,
                letterSpacing: '-0.5px' }}>
                KES {s.val.toLocaleString('en-KE')}
              </p>
            </div>
          ))}
        </div>

        {/* Spending by category */}
        {catData.length > 0 && (
          <div className="glass" style={{ padding: '20px' }}>
            <p className="section-label" style={{ marginBottom: '16px' }}>
              SPENDING BY CATEGORY
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <PieChart width={120} height={120}>
                <Pie data={catData} cx={55} cy={55} innerRadius={35}
                  outerRadius={55} dataKey="value" strokeWidth={0}>
                  {catData.map((_, i) => (
                    <Cell key={i} fill={GRAYS[i % GRAYS.length]} />
                  ))}
                </Pie>
              </PieChart>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {catData.map((c, i) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px',
                      background: GRAYS[i], flexShrink: 0 }} />
                    <p style={{ flex: 1, fontSize: '13px',
                      color: 'rgba(255,255,255,0.7)' }}>{c.name}</p>
                    <p style={{ fontSize: '13px', fontWeight: 700 }}>
                      {Math.round((c.value / totalSpent) * 100)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Daily spending chart */}
        {last14.some(d => d.amount > 0) && (
          <div className="glass" style={{ padding: '20px' }}>
            <p className="section-label" style={{ marginBottom: '16px' }}>
              DAILY SPENDING (14 DAYS)
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={last14} barSize={14}>
                <Bar dataKey="amount" fill="rgba(255,255,255,0.6)" radius={[3,3,0,0]} />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)',
                  fontSize: 10 }} axisLine={false} tickLine={false}
                  interval={1} />
                <Tooltip
                  contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#FFF', fontSize: '13px' }}
                  formatter={(v) => [`KES ${v.toLocaleString('en-KE')}`, 'Spent']}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Float history */}
        {floatChartData.length > 1 && (
          <div className="glass" style={{ padding: '20px' }}>
            <p className="section-label" style={{ marginBottom: '16px' }}>
              FLOAT TREND (7 DAYS)
            </p>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={floatChartData}>
                <Line type="monotone" dataKey="float" stroke="#FFFFFF"
                  strokeWidth={2} dot={false} />
                <Tooltip
                  contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#FFF', fontSize: '13px' }}
                  formatter={(v) => [`KES ${v.toLocaleString('en-KE')}`, 'Float']}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Calm score history */}
        <div className="glass" style={{ padding: '20px' }}>
          <p className="section-label" style={{ marginBottom: '8px' }}>FINANCIAL HEALTH</p>
          <div style={{ display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '40px', fontWeight: 900,
                letterSpacing: '-2px' }}>{calmScore}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Calm Score</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '22px', fontWeight: 800,
                color: calmScore >= 70 ? '#FFF' : calmScore >= 40
                  ? 'rgba(255,220,100,0.9)' : 'rgba(255,100,100,0.9)' }}>
                {calmScore >= 70 ? 'Floating Well 🌊'
                  : calmScore >= 40 ? 'Watch It ⚠️' : 'At Risk 🔴'}
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                {calmScore >= 70 ? 'Keep it up!'
                  : calmScore >= 40 ? 'Be mindful today'
                  : 'Consider pausing spending'}
              </p>
            </div>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)',
            borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '3px',
              width: `${calmScore}%`, background: '#FFFFFF',
              transition: 'width 1s ease-out' }} />
          </div>
        </div>

        {/* Income vs Expenses */}
        {(totalIncome > 0 || totalSpent > 0) && (
          <div className="glass" style={{ padding: '20px' }}>
            <p className="section-label" style={{ marginBottom: '16px' }}>
              INCOME VS EXPENSES
            </p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              {[
                { label: 'Income', val: totalIncome, width: totalIncome/(totalIncome+totalSpent||1)*100 },
                { label: 'Expenses', val: totalSpent, width: totalSpent/(totalIncome+totalSpent||1)*100 }
              ].map(s => (
                <div key={s.label} style={{ flex: 1 }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)',
                    marginBottom: '4px' }}>{s.label}</p>
                  <p style={{ fontSize: '18px', fontWeight: 800,
                    letterSpacing: '-0.5px', marginBottom: '8px' }}>
                    KES {s.val.toLocaleString('en-KE')}
                  </p>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)',
                    borderRadius: '2px' }}>
                    <div style={{ height: '100%', borderRadius: '2px',
                      width: `${s.width}%`, background: '#FFF' }} />
                  </div>
                </div>
              ))}
            </div>
            {totalIncome > 0 && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)',
                marginTop: '8px' }}>
                Savings rate: {Math.max(0, Math.round(((totalIncome - totalSpent) / totalIncome) * 100))}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
