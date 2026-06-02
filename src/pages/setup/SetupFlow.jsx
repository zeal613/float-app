import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

const PERSONALITIES = [
  { id: 'impulsive', emoji: '💸', label: 'I spend before I think' },
  { id: 'anxious', emoji: '😰', label: "I never know if I have enough" },
  { id: 'untracked', emoji: '📊', label: 'I lose track of where it goes' },
  { id: 'broke', emoji: '😤', label: 'I run out before payday' },
]

export default function SetupFlow({ onComplete }) {
  const { user, updateProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [balance, setBalance] = useState('')
  const [payday, setPayday] = useState(25)
  const [reserve, setReserve] = useState(5000)
  const [personality, setPersonality] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  const daysUntilPayday = Math.max(1, (() => {
    const d = payday - new Date().getDate()
    return d <= 0 ? d + 30 : d
  })())

  const floatPreview = Math.max(0, Math.round(
    ((parseFloat(balance) || 0) - reserve) / daysUntilPayday
  ))

  const finish = async () => {
    setLoading(true)
    setError('')

    try {
      const uid = user?.id
      if (!uid) throw new Error('Session expired. Please sign in again.')

      // 1. Save account balance - try upsert first, then insert
      const balanceVal = parseFloat(balance) || 0
      const { error: accErr } = await supabase
        .from('accounts')
        .upsert({
          user_id: uid,
          name: 'M-Pesa',
          type: 'mpesa',
          balance: balanceVal,
          is_primary: true
        }, { onConflict: 'user_id' })

      if (accErr) {
        // Try plain insert if upsert fails
        await supabase.from('accounts').insert({
          user_id: uid,
          name: 'M-Pesa',
          type: 'mpesa',
          balance: balanceVal,
          is_primary: true
        })
      }

      // 2. Update profile with all setup data
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: uid,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Friend',
          payday_date: payday,
          emergency_reserve_target: reserve,
          spending_personality: personality,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (profileErr) throw new Error('Could not save profile: ' + profileErr.message)

      // 3. Add welcome notifications
      await supabase.from('notifications').insert([
        { user_id: uid, title: 'Welcome to FLOAT 🌊', message: `Hey ${firstName}! Your float is ready. This is your safe daily spending number.`, type: 'insight' },
        { user_id: uid, title: 'Import M-Pesa SMS', message: 'Paste your M-Pesa messages to see all transactions instantly.', type: 'insight' },
      ])

      // 4. Done
      onComplete()

    } catch (e) {
      console.error('Setup error:', e)
      setError(e.message || 'Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  const S = {
    page: { height: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', padding: '80px 28px 40px' },
    label: { fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '12px' },
    title: { fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.3, marginBottom: '8px' },
    sub: { fontSize: '15px', color: 'rgba(255,255,255,0.45)', marginBottom: '24px' }
  }

  const steps = [
    <div key={0} style={S.page}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
        <div style={{ fontSize: '56px', fontWeight: 900, letterSpacing: '-4px', color: '#FFF' }}>FLOAT</div>
        <div>
          <p style={{ fontSize: '26px', fontWeight: 700, lineHeight: 1.3, marginBottom: '12px' }}>
            Hi {firstName}.<br />Let's figure out what<br />you can actually spend.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '16px', lineHeight: 1.6 }}>Takes 60 seconds. No budgets needed.</p>
        </div>
      </div>
      <button className="btn btn-white" onClick={() => setStep(1)}>Let's go →</button>
    </div>,

    <div key={1} style={S.page}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={S.label}>Step 1 of 4</p>
        <h2 style={S.title}>How much is in your M-Pesa right now?</h2>
        <p style={S.sub}>Just an estimate is fine.</p>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '18px', fontWeight: 700 }}>KES</span>
          <input className="input" type="number" placeholder="0" value={balance}
            onChange={e => setBalance(e.target.value)}
            style={{ paddingLeft: '60px', fontSize: '24px', fontWeight: 700, height: '64px' }} />
        </div>
        {balance && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginTop: '8px' }}>KES {parseFloat(balance).toLocaleString('en-KE')} ✓</p>}
      </div>
      <button className="btn btn-white" onClick={() => setStep(2)} disabled={!balance || parseFloat(balance) < 0}>Next →</button>
    </div>,

    <div key={2} style={S.page}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={S.label}>Step 2 of 4</p>
        <h2 style={S.title}>When do you usually get paid?</h2>
        <p style={S.sub}>Pick the day of the month.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
            <button key={d} onClick={() => setPayday(d)} className="btn" style={{
              height: '44px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
              background: payday === d ? '#FFF' : 'rgba(255,255,255,0.06)',
              color: payday === d ? '#000' : '#FFF',
              border: payday === d ? 'none' : '1px solid rgba(255,255,255,0.08)'
            }}>{d}</button>
          ))}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '12px' }}>Selected: {payday}th of every month</p>
      </div>
      <button className="btn btn-white" onClick={() => setStep(3)}>Next →</button>
    </div>,

    <div key={3} style={S.page}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={S.label}>Step 3 of 4</p>
        <h2 style={S.title}>How much do you keep as a safety net?</h2>
        <p style={S.sub}>FLOAT never touches this. It's protected.</p>
        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
          <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '16px' }}>KES {reserve.toLocaleString('en-KE')}</div>
          <input type="range" min={0} max={50000} step={500} value={reserve}
            onChange={e => setReserve(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#FFF', cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
            <span>KES 0</span><span>KES 50,000</span>
          </div>
        </div>
      </div>
      <button className="btn btn-white" onClick={() => setStep(4)}>Next →</button>
    </div>,

    <div key={4} style={S.page}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p style={S.label}>Step 4 of 4</p>
        <h2 style={S.title}>What's your biggest money struggle?</h2>
        <p style={S.sub}>We'll personalize your experience.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {PERSONALITIES.map(p => (
            <button key={p.id} onClick={() => setPersonality(p.id)} className="btn" style={{
              height: '60px', borderRadius: '14px', padding: '0 20px',
              justifyContent: 'flex-start', gap: '14px',
              background: personality === p.id ? '#FFF' : 'rgba(255,255,255,0.05)',
              color: personality === p.id ? '#000' : '#FFF',
              border: personality === p.id ? 'none' : '1px solid rgba(255,255,255,0.08)',
              fontSize: '15px', fontWeight: 600
            }}>
              <span style={{ fontSize: '20px' }}>{p.emoji}</span>{p.label}
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-white" onClick={() => setStep(5)} disabled={!personality} style={{ opacity: personality ? 1 : 0.5 }}>Next →</button>
    </div>,

    <div key={5} style={{ ...S.page, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)' }}>You can float</p>
        <div style={{ fontSize: '72px', fontWeight: 900, letterSpacing: '-4px', lineHeight: 1, color: '#FFF' }}>
          KES {floatPreview.toLocaleString('en-KE')}
        </div>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>today</p>
        <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', maxWidth: '320px' }}>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
            {firstName}, you're already ahead.<br />
            Most people have no idea what they can spend.<br />
            <strong style={{ color: '#FFF' }}>You do now.</strong>
          </p>
        </div>
        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '12px', maxWidth: '320px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,120,120,0.9)' }}>{error}</p>
          </div>
        )}
      </div>
      <button className="btn btn-white" onClick={finish} disabled={loading} style={{ opacity: loading ? 0.7 : 1, width: '100%' }}>
        {loading ? 'Setting up...' : 'Start Floating 🌊'}
      </button>
      {loading && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>Saving your data...</p>}
    </div>
  ]

  return (
    <div style={{ height: '100vh', background: '#0A0A0A', overflow: 'hidden' }}>
      {step > 0 && step < 5 && (
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ width: i <= step ? '20px' : '6px', height: '6px', borderRadius: '3px', transition: 'all 0.3s', background: i <= step ? '#FFF' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
      )}
      {steps[step]}
    </div>
  )
}
