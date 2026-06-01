import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useFloat } from '../hooks/useFloat'
import { useSMSWatcher, parseSingleSMS } from '../hooks/useSMSWatcher'
import AnimatedNumber from '../components/shared/AnimatedNumber'
import AIAssistant from '../components/AIAssistant'
import ReceiptScanner from '../components/ReceiptScanner'
import { supabase } from '../lib/supabase'

function greeting(name) {
  const h = new Date().getHours()
  if (h < 12) return `Good morning, ${name} ☀️`
  if (h < 17) return `Good afternoon, ${name}`
  if (h < 21) return `Good evening, ${name}`
  return `Hey ${name}, still up? 🌙`
}

function CalmArc({ score }) {
  const r = 45, circ = Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="120" height="70" viewBox="0 0 120 75">
      <path d={`M15,60 A${r},${r} 0 0,1 105,60`}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" strokeLinecap="round"/>
      <path d={`M15,60 A${r},${r} 0 0,1 105,60`}
        fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}/>
      <text x="60" y="52" textAnchor="middle" fill="#FFF"
        fontSize="20" fontWeight="800" fontFamily="DM Sans,sans-serif" letterSpacing="-1">{score}</text>
      <text x="60" y="68" textAnchor="middle" fill="rgba(255,255,255,0.4)"
        fontSize="9" fontWeight="600" fontFamily="DM Sans,sans-serif" letterSpacing="1.5">CALM</text>
    </svg>
  )
}

// Toast notification
function Toast({ msg, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{
      position: 'fixed', top: '60px', left: '16px', right: '16px',
      background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '14px', padding: '14px 16px', zIndex: 300,
      display: 'flex', alignItems: 'center', gap: '10px',
      animation: 'slideUp 0.3s ease-out', boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
    }}>
      <span style={{ fontSize: '20px' }}>📲</span>
      <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#FFF' }}>{msg}</p>
    </div>
  )
}

function AddSheet({ type, onClose, onSaved, userId, primaryAccountId }) {
  const [amount, setAmount] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Other')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const floatData = useFloat()
  const chips = [500, 1000, 2500, 5000]
  const cats = ['Food','Transport','Bills','Entertainment','Health','Shopping','Savings','Other']

  const previewFloat = amount && parseFloat(amount) > 0
    ? (type === 'income'
        ? floatData.floatAmount + Math.round(parseFloat(amount) / Math.max(1, floatData.daysUntilPayday))
        : floatData.floatAmount - Math.round(parseFloat(amount) / Math.max(1, floatData.daysUntilPayday)))
    : null

  const save = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setLoading(true)
    const val = parseFloat(amount)
    const finalAmount = type === 'expense' ? -val : val
    await supabase.from('transactions').insert({
      user_id: userId, account_id: primaryAccountId,
      name: name || (type === 'income' ? 'Income' : category),
      amount: finalAmount, type, category: type === 'income' ? 'Income' : category,
      note, date: new Date().toISOString(), is_mpesa: false
    })
    if (primaryAccountId) {
      const { data: acc } = await supabase.from('accounts')
        .select('balance').eq('id', primaryAccountId).single()
      if (acc) await supabase.from('accounts')
        .update({ balance: (acc.balance || 0) + finalAmount }).eq('id', primaryAccountId)
    }
    setLoading(false)
    onSaved(); onClose()
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose}/>
      <div className="sheet">
        <div className="drag-handle"/>
        <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px', letterSpacing: '-0.5px' }}>
          {type === 'income' ? '💰 Add Income' : '💸 Add Expense'}
        </h3>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%',
            transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontWeight: 700 }}>KES</span>
          <input className="input" type="number" placeholder="0" value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ paddingLeft: '56px', fontSize: '24px', fontWeight: 700, height: '64px' }}/>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {chips.map(c => (
            <button key={c} className="btn btn-sm"
              onClick={() => setAmount(String((parseFloat(amount)||0)+c))}>
              +{c.toLocaleString()}
            </button>
          ))}
        </div>
        <input className="input" placeholder={type === 'income' ? 'Source (e.g. Freelance)' : 'Name'}
          value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: '12px' }}/>
        {type === 'expense' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '12px' }}>
            {cats.map(c => (
              <button key={c} onClick={() => setCategory(c)} className="btn" style={{
                height: '44px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                background: category === c ? '#FFF' : 'rgba(255,255,255,0.06)',
                color: category === c ? '#000' : '#FFF',
                border: category === c ? 'none' : '1px solid rgba(255,255,255,0.08)'
              }}>{c}</button>
            ))}
          </div>
        )}
        <input className="input" placeholder="Note (optional)"
          value={note} onChange={e => setNote(e.target.value)} style={{ marginBottom: '12px' }}/>

        {/* Live float preview */}
        {previewFloat !== null && (
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
            marginBottom: '16px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Float after this:</p>
            <p style={{ fontSize: '16px', fontWeight: 800,
              color: previewFloat > floatData.floatAmount ? '#FFF' : 'rgba(255,180,80,0.9)' }}>
              KES {Math.max(0,previewFloat).toLocaleString('en-KE')}
            </p>
          </div>
        )}

        <button className="btn btn-white" onClick={save}
          disabled={loading || !amount} style={{ opacity: loading || !amount ? 0.5 : 1 }}>
          {loading ? 'Saving...' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
        </button>
      </div>
    </>
  )
}

function AddBillSheet({ onClose, onSaved, userId }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [recurring, setRecurring] = useState(true)
  const [loading, setLoading] = useState(false)
  const save = async () => {
    if (!name || !amount || !dueDate) return
    setLoading(true)
    await supabase.from('bills').insert({
      user_id: userId, name, amount: parseFloat(amount),
      due_date: dueDate, is_recurring: recurring,
      recurrence: recurring ? 'monthly' : null, category: 'Bills'
    })
    setLoading(false); onSaved(); onClose()
  }
  return (
    <>
      <div className="sheet-overlay" onClick={onClose}/>
      <div className="sheet">
        <div className="drag-handle"/>
        <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>📋 Add Bill</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="input" placeholder="Bill name (e.g. Netflix)" value={name}
            onChange={e => setName(e.target.value)}/>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%',
              transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>KES</span>
            <input className="input" type="number" placeholder="0" value={amount}
              onChange={e => setAmount(e.target.value)} style={{ paddingLeft: '52px' }}/>
          </div>
          <input className="input" type="date" value={dueDate}
            onChange={e => setDueDate(e.target.value)} style={{ colorScheme: 'dark' }}/>
          <button onClick={() => setRecurring(p => !p)} className="btn" style={{
            height: '48px', borderRadius: '12px', justifyContent: 'space-between',
            padding: '0 16px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', color: '#FFF', fontSize: '14px'
          }}>
            <span>Repeats monthly</span>
            <div style={{ width: '44px', height: '24px', borderRadius: '12px',
              background: recurring ? '#FFF' : 'rgba(255,255,255,0.15)',
              position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: '3px',
                left: recurring ? '22px' : '3px', width: '18px', height: '18px',
                borderRadius: '50%', background: recurring ? '#000' : '#FFF',
                transition: 'left 0.2s' }}/>
            </div>
          </button>
        </div>
        <button className="btn btn-white" onClick={save}
          disabled={loading || !name || !amount || !dueDate}
          style={{ opacity: loading || !name || !amount || !dueDate ? 0.5 : 1, marginTop: '20px' }}>
          {loading ? 'Saving...' : 'Add Bill'}
        </button>
      </div>
    </>
  )
}

export default function HomeScreen({ onNavigate }) {
  const { profile, user } = useAuth()
  const floatData = useFloat()
  const [sheet, setSheet] = useState(null)
  const [showAI, setShowAI] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [toast, setToast] = useState(null)
  const [primaryAccId, setPrimaryAccId] = useState(null)
  const [prevFloat, setPrevFloat] = useState(null)
  const [floatDelta, setFloatDelta] = useState(null)

  const { floatAmount, calmScore, riskLevel, totalBalance,
    upcomingBills, totalBillsDue, daysUntilPayday,
    emergencyReserve, spentToday, notifications, unreadCount,
    recentTransactions, isLoading, refresh } = floatData

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  // Track float changes for delta display
  useEffect(() => {
    if (floatAmount > 0 && prevFloat !== null && prevFloat !== floatAmount) {
      const delta = floatAmount - prevFloat
      setFloatDelta(delta)
      setTimeout(() => setFloatDelta(null), 3000)
    }
    if (floatAmount > 0) setPrevFloat(floatAmount)
  }, [floatAmount])

  // Get primary account
  useEffect(() => {
    if (!user || primaryAccId) return
    supabase.from('accounts').select('id').eq('user_id', user.id)
      .eq('is_primary', true).single()
      .then(({ data }) => data && setPrimaryAccId(data.id))
  }, [user])

  // SMS auto-detection
  const handleNewSMSTransaction = useCallback(async (parsed) => {
    if (!user || !primaryAccId) return
    const finalAmount = parsed.type === 'income' ? parsed.amount : -parsed.amount
    await supabase.from('transactions').insert({
      user_id: user.id, account_id: primaryAccId,
      name: parsed.name, amount: finalAmount, type: parsed.type,
      category: parsed.category, date: parsed.date,
      is_mpesa: true, mpesa_ref: parsed.ref || null
    })
    const { data: acc } = await supabase.from('accounts')
      .select('balance').eq('id', primaryAccId).single()
    if (acc) await supabase.from('accounts')
      .update({ balance: (acc.balance || 0) + finalAmount }).eq('id', primaryAccId)

    setToast(
      parsed.type === 'income'
        ? `M-Pesa detected: +KES ${parsed.amount.toLocaleString('en-KE')} from ${parsed.name}. Float updated! 🌊`
        : `M-Pesa detected: -KES ${parsed.amount.toLocaleString('en-KE')} to ${parsed.name}. Float updated.`
    )
    refresh()
  }, [user, primaryAccId, refresh])

  useSMSWatcher(user?.id, handleNewSMSTransaction)

  const riskColor = riskLevel === 'SAFE'
    ? 'rgba(120,255,160,0.85)' : riskLevel === 'CAUTION'
    ? 'rgba(255,210,80,0.85)' : 'rgba(255,100,100,0.85)'

  const insightMessages = notifications.filter(n => n.type === 'insight').slice(0, 3)
  const displayInsights = insightMessages.length > 0 ? insightMessages : [
    { id: '1', message: 'Import your M-Pesa SMS to see real insights here.' },
    { id: '2', message: 'Add your recurring bills so FLOAT protects that money.' },
    { id: '3', message: 'Your float updates live every time you add a transaction.' },
  ]

  // Dynamic home state message
  const getMoodMessage = () => {
    if (riskLevel === 'AT RISK') return { text: 'Tight day. Every KES counts.', icon: '⚠️' }
    if (spentToday > floatAmount * 0.7) return { text: 'You\'ve used most of today\'s float.', icon: '👀' }
    const h = new Date().getHours()
    if (h >= 20) return { text: `Good spending day. Float intact.`, icon: '✅' }
    if (riskLevel === 'SAFE') return { text: 'You\'re floating well today.', icon: '🌊' }
    return { text: 'Spend with intention today.', icon: '💡' }
  }
  const mood = getMoodMessage()

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '100px' }}>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '56px 24px 12px' }}>
        <div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)',
            fontWeight: 500, marginBottom: '2px' }}>
            {new Date().toLocaleDateString('en-KE', { weekday:'long', month:'long', day:'numeric' })}
          </p>
          <p style={{ fontSize: '16px', fontWeight: 600 }}>{greeting(firstName)}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* AI Assistant button */}
          <button onClick={() => setShowAI(true)} className="btn" style={{
            width: '40px', height: '40px', borderRadius: '11px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)', fontSize: '16px' }}>🤖</button>
          {/* Notifications */}
          <button onClick={() => setSheet('notifications')} className="btn" style={{
            width: '40px', height: '40px', borderRadius: '11px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '16px', position: 'relative' }}>
            🔔
            {unreadCount > 0 && (
              <div style={{ position: 'absolute', top: '-3px', right: '-3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#FFF', color: '#000', fontSize: '9px',
                fontWeight: 800, display: 'flex', alignItems: 'center',
                justifyContent: 'center' }}>{unreadCount}</div>
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* FLOAT HERO */}
        <div className="glass animate-breathe" style={{ padding: '22px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <div className="animate-pulse" style={{ width: '6px', height: '6px',
              borderRadius: '50%', background: '#FFF' }}/>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px',
              color: 'rgba(255,255,255,0.4)' }}>LIVE</span>
            <div style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: '20px',
              fontSize: '10px', fontWeight: 700, color: riskColor,
              border: `1px solid ${riskColor}` }}>{riskLevel}</div>
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)',
            fontWeight: 500, marginBottom: '2px' }}>You can float</p>

          {isLoading ? (
            <div className="shimmer" style={{ height: '72px', width: '55%', marginBottom: '4px' }}/>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: '68px', fontWeight: 900, letterSpacing: '-5px',
                lineHeight: 1, color: '#FFF', marginBottom: '2px' }} className="animate-count">
                <AnimatedNumber value={floatAmount} duration={1200} prefix="KES "/>
              </div>
              {floatDelta !== null && (
                <div style={{ position: 'absolute', right: '0', top: '8px',
                  fontSize: '14px', fontWeight: 700,
                  color: floatDelta > 0 ? 'rgba(120,255,160,0.9)' : 'rgba(255,180,80,0.9)',
                  animation: 'slideUp 0.3s ease-out' }}>
                  {floatDelta > 0 ? '▲' : '▼'} KES {Math.abs(floatDelta).toLocaleString('en-KE')}
                </div>
              )}
            </div>
          )}
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)',
            marginBottom: '16px' }}>safe to spend today</p>

          {/* Mood line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
            borderRadius: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px' }}>{mood.icon}</span>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{mood.text}</p>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.07)',
            paddingTop: '14px' }}>
            {[
              { label: 'bills due', value: `KES ${totalBillsDue.toLocaleString('en-KE')}` },
              { label: 'reserved', value: `KES ${emergencyReserve.toLocaleString('en-KE')}` },
              { label: 'til payday', value: `${daysUntilPayday}d` },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                padding: '0 6px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>{s.value}</p>
                <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)',
                  fontWeight: 600, letterSpacing: '0.5px' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
            <CalmArc score={calmScore}/>
          </div>
        </div>

        {/* Ask AI strip */}
        <button onClick={() => setShowAI(true)} className="btn glass" style={{
          height: '52px', borderRadius: '14px', gap: '10px',
          justifyContent: 'flex-start', padding: '0 16px',
          color: 'rgba(255,255,255,0.6)', fontSize: '14px',
          fontWeight: 500 }}>
          <span style={{ fontSize: '20px' }}>🤖</span>
          Ask your financial assistant...
          <span style={{ marginLeft: 'auto', fontSize: '12px',
            color: 'rgba(255,255,255,0.25)' }}>AI →</span>
        </button>

        {/* Insights */}
        <div>
          <p className="section-label" style={{ marginBottom: '10px' }}>TODAY'S INSIGHTS</p>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto',
            paddingBottom: '4px', marginRight: '-20px', paddingRight: '20px' }}>
            {displayInsights.map((ins, i) => (
              <div key={ins.id || i} style={{ minWidth: '240px', padding: '14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderLeft: '3px solid rgba(255,255,255,0.35)',
                borderRadius: '14px', flexShrink: 0 }}>
                <p style={{ fontSize: '13px', lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.75)' }}>{ins.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming bills */}
        {upcomingBills.length > 0 && (
          <div>
            <p className="section-label" style={{ marginBottom: '10px' }}>UPCOMING BILLS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {upcomingBills.slice(0, 4).map(bill => {
                const days = Math.ceil((new Date(bill.due_date) - new Date()) / 86400000)
                return (
                  <div key={bill.id} className="glass" style={{ display: 'flex',
                    alignItems: 'center', padding: '12px 14px', borderRadius: '13px', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '9px',
                      background: 'rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📋</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{bill.name}</p>
                      <p style={{ fontSize: '11px', color: days <= 2
                        ? 'rgba(255,200,80,0.9)' : 'rgba(255,255,255,0.35)' }}>
                        {days <= 0 ? 'Due today!' : `in ${days} day${days !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 700 }}>
                      KES {bill.amount.toLocaleString('en-KE')}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick actions — now with receipt scan */}
        <div>
          <p className="section-label" style={{ marginBottom: '10px' }}>QUICK ACTIONS</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { icon: '💰', label: 'Add Income', action: () => setSheet('income') },
              { icon: '💸', label: 'Add Expense', action: () => setSheet('expense') },
              { icon: '📷', label: 'Scan Receipt', action: () => setShowReceipt(true) },
              { icon: '📋', label: 'Add Bill', action: () => setSheet('bill') },
              { icon: '📲', label: 'Import M-Pesa', action: () => onNavigate('import') },
              { icon: '🤖', label: 'Ask AI Guide', action: () => setShowAI(true) },
            ].map(a => (
              <button key={a.label} onClick={a.action} className="btn glass"
                style={{ height: '72px', flexDirection: 'column', gap: '6px',
                  borderRadius: '14px', fontSize: '12px', fontWeight: 600, color: '#FFF' }}>
                <span style={{ fontSize: '22px' }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        {recentTransactions.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '10px' }}>
              <p className="section-label">RECENT</p>
              <span onClick={() => onNavigate('activity')}
                style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                See all →
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {recentTransactions.slice(0, 5).map(tx => {
                const emojis = { Food:'🍔', Transport:'🚗', Bills:'📱', Entertainment:'🎬',
                  Health:'💊', Shopping:'🛍', Savings:'💰', Income:'💵', Other:'⚡',
                  Cash:'💵', Airtime:'📡', Banking:'🏦' }
                return (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center',
                    padding: '11px 0', gap: '10px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', flexShrink: 0 }}>
                      {emojis[tx.category] || '⚡'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.name}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{tx.category}</p>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 700, flexShrink: 0,
                      color: tx.amount > 0 ? '#FFF' : 'rgba(255,255,255,0.55)' }}>
                      {tx.amount > 0 ? '+' : '-'}KES {Math.abs(tx.amount).toLocaleString('en-KE')}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sheets */}
      {sheet === 'income' && <AddSheet type="income" onClose={() => setSheet(null)}
        onSaved={refresh} userId={user?.id} primaryAccountId={primaryAccId}/>}
      {sheet === 'expense' && <AddSheet type="expense" onClose={() => setSheet(null)}
        onSaved={refresh} userId={user?.id} primaryAccountId={primaryAccId}/>}
      {sheet === 'bill' && <AddBillSheet onClose={() => setSheet(null)}
        onSaved={refresh} userId={user?.id}/>}

      {/* Notifications sheet */}
      {sheet === 'notifications' && (
        <>
          <div className="sheet-overlay" onClick={() => setSheet(null)}/>
          <div className="sheet">
            <div className="drag-handle"/>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Notifications</h3>
              {unreadCount > 0 && (
                <button className="btn btn-sm" onClick={async () => {
                  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user?.id)
                  refresh()
                }}>Mark all read</button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '32px 0' }}>
                No notifications yet.
              </p>
            ) : notifications.map(n => (
              <div key={n.id} style={{ padding: '13px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%',
                  background: n.is_read ? 'rgba(255,255,255,0.2)' : '#FFF',
                  marginTop: '5px', flexShrink: 0 }}/>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>{n.title}</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)',
                    lineHeight: 1.5 }}>{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* AI Assistant */}
      {showAI && <AIAssistant onClose={() => setShowAI(false)}/>}

      {/* Receipt Scanner */}
      {showReceipt && (
        <ReceiptScanner
          onClose={() => setShowReceipt(false)}
          onSaved={() => { refresh(); setShowReceipt(false) }}
        />
      )}
    </div>
  )
}
