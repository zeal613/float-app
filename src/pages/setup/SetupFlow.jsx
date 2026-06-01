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
  const { user, updateProfile, refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [balance, setBalance] = useState('')
  const [payday, setPayday] = useState(25)
  const [reserve, setReserve] = useState(5000)
  const [personality, setPersonality] = useState('')
  const [loading, setLoading] = useState(false)

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  const daysUntilPayday = Math.max(1, payday - new Date().getDate() <= 0
    ? payday - new Date().getDate() + 30
    : payday - new Date().getDate())

  const floatPreview = Math.max(0, Math.round(
    ((parseFloat(balance) || 0) - reserve) / daysUntilPayday
  ))

  const next = () => setStep(s => s + 1)

  const finish = async () => {
    setLoading(true)
    await supabase.from('accounts').upsert({
      user_id: user.id, name: 'M-Pesa', type: 'mpesa',
      balance: parseFloat(balance) || 0, is_primary: true
    }, { onConflict: 'user_id' })

    await updateProfile({
      payday_date: payday,
      emergency_reserve_target: reserve,
      spending_personality: personality,
      onboarding_completed: true
    })

    // Create welcome notifications
    await supabase.from('notifications').insert([
      { user_id: user.id, title: 'Welcome to FLOAT 🌊',
        message: `Hey ${firstName}! Your float is ready. This is your safe daily spending number.`, type: 'insight' },
      { user_id: user.id, title: 'Import your M-Pesa SMS',
        message: 'Paste your M-Pesa messages to see all your transactions instantly.', type: 'insight' },
      { user_id: user.id, title: 'Add your recurring bills',
        message: 'Add bills like rent and subscriptions so FLOAT protects that money automatically.', type: 'insight' },
    ])

    await refreshProfile()
    setLoading(false)
    onComplete()
  }

  const steps = [
    // Step 0 — Intro
    <div key={0} style={pageStyle} className="animate-slide-up">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', gap: '20px' }}>
        <div style={{ fontSize: '56px', fontWeight: 900,
          letterSpacing: '-4px', color: '#FFF' }}>FLOAT</div>
        <div>
          <p style={{ fontSize: '26px', fontWeight: 700,
            letterSpacing: '-0.5px', lineHeight: 1.3, marginBottom: '12px' }}>
            Hi {firstName}.<br />
            Let's figure out what<br />
            you can actually spend.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '16px', lineHeight: 1.6 }}>
            Takes 60 seconds. No budgets, no spreadsheets.
          </p>
        </div>
      </div>
      <button className="btn btn-white" onClick={next}>Let's go →</button>
    </div>,

    // Step 1 — Balance
    <div key={1} style={pageStyle} className="animate-slide-up">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' }}>
        <div>
          <p style={labelStyle}>Step 1 of 4</p>
          <h2 style={titleStyle}>How much is in your M-Pesa right now?</h2>
          <p style={subStyle}>Just an estimate is fine.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '18px', top: '50%',
            transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)',
            fontSize: '18px', fontWeight: 700 }}>KES</span>
          <input className="input" type="number" placeholder="0"
            value={balance} onChange={e => setBalance(e.target.value)}
            style={{ paddingLeft: '60px', fontSize: '24px', fontWeight: 700,
              height: '64px', letterSpacing: '-0.5px' }} />
        </div>
        {balance && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            KES {parseFloat(balance).toLocaleString('en-KE')} entered ✓
          </p>
        )}
      </div>
      <button className="btn btn-white" onClick={next}
        disabled={!balance || parseFloat(balance) < 0}>Next →</button>
    </div>,

    // Step 2 — Payday
    <div key={2} style={pageStyle} className="animate-slide-up">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' }}>
        <div>
          <p style={labelStyle}>Step 2 of 4</p>
          <h2 style={titleStyle}>When does money usually come in?</h2>
          <p style={subStyle}>Pick the day of month you get paid.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
            <button key={d} onClick={() => setPayday(d)}
              className="btn"
              style={{
                height: '44px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                background: payday === d ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                color: payday === d ? '#000' : '#FFF',
                border: payday === d ? 'none' : '1px solid rgba(255,255,255,0.08)'
              }}>
              {d}
            </button>
          ))}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Selected: {payday}{payday === 1 ? 'st' : payday === 2 ? 'nd' : payday === 3 ? 'rd' : 'th'} of every month
        </p>
      </div>
      <button className="btn btn-white" onClick={next}>Next →</button>
    </div>,

    // Step 3 — Reserve
    <div key={3} style={pageStyle} className="animate-slide-up">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' }}>
        <div>
          <p style={labelStyle}>Step 3 of 4</p>
          <h2 style={titleStyle}>How much do you keep as a safety net?</h2>
          <p style={subStyle}>FLOAT never touches this. It's protected.</p>
        </div>
        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
          <div style={{ fontSize: '32px', fontWeight: 800,
            letterSpacing: '-1px', marginBottom: '16px' }}>
            KES {reserve.toLocaleString('en-KE')}
          </div>
          <input type="range" min={0} max={50000} step={500}
            value={reserve} onChange={e => setReserve(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#FFFFFF', height: '4px', cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between',
            marginTop: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
            <span>KES 0</span><span>KES 50,000</span>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          💡 Most people keep 1–2 months of expenses as a safety net.
        </p>
      </div>
      <button className="btn btn-white" onClick={next}>Next →</button>
    </div>,

    // Step 4 — Personality
    <div key={4} style={pageStyle} className="animate-slide-up">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' }}>
        <div>
          <p style={labelStyle}>Step 4 of 4</p>
          <h2 style={titleStyle}>What's your biggest money struggle?</h2>
          <p style={subStyle}>We'll personalize your experience.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {PERSONALITIES.map(p => (
            <button key={p.id} onClick={() => setPersonality(p.id)}
              className="btn"
              style={{
                height: '60px', borderRadius: '14px', padding: '0 20px',
                justifyContent: 'flex-start', gap: '14px',
                background: personality === p.id ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                color: personality === p.id ? '#000' : '#FFF',
                border: personality === p.id ? 'none' : '1px solid rgba(255,255,255,0.08)',
                fontSize: '15px', fontWeight: 600
              }}>
              <span style={{ fontSize: '20px' }}>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-white" onClick={next}
        disabled={!personality} style={{ opacity: personality ? 1 : 0.5 }}>
        Next →
      </button>
    </div>,

    // Step 5 — Reveal
    <div key={5} style={{ ...pageStyle, alignItems: 'center', textAlign: 'center' }}
      className="animate-slide-up">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
          You can float
        </p>
        <div style={{ fontSize: '72px', fontWeight: 900, letterSpacing: '-4px',
          lineHeight: 1, color: '#FFFFFF', animation: 'countUp 0.8s cubic-bezier(0.16,1,0.3,1)' }}>
          KES {floatPreview.toLocaleString('en-KE')}
        </div>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>today</p>

        <div style={{ marginTop: '8px', padding: '16px 24px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
            {firstName}, you're already ahead.<br />
            Most people have no idea what they can spend.<br />
            <span style={{ color: '#FFF', fontWeight: 700 }}>You do now.</span>
          </p>
        </div>
      </div>
      <button className="btn btn-white" onClick={finish}
        disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Setting up...' : 'Start Floating 🌊'}
      </button>
    </div>
  ]

  return (
    <div style={{ height: '100vh', background: '#0A0A0A', overflow: 'hidden' }}>
      {/* Progress dots */}
      {step > 0 && step < 5 && (
        <div style={{ position: 'absolute', top: '20px', left: '50%',
          transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              width: i <= step ? '20px' : '6px', height: '6px',
              borderRadius: '3px', transition: 'all 0.3s ease',
              background: i <= step ? '#FFFFFF' : 'rgba(255,255,255,0.2)'
            }} />
          ))}
        </div>
      )}
      {steps[step]}
    </div>
  )
}

const pageStyle = {
  height: '100vh', background: '#0A0A0A',
  display: 'flex', flexDirection: 'column',
  padding: '80px 28px calc(env(safe-area-inset-bottom,0px) + 40px)',
  gap: '0'
}
const labelStyle = { fontSize: '11px', fontWeight: 700,
  letterSpacing: '2px', color: 'rgba(255,255,255,0.3)',
  textTransform: 'uppercase', marginBottom: '12px' }
const titleStyle = { fontSize: '26px', fontWeight: 800,
  letterSpacing: '-0.5px', lineHeight: 1.3, marginBottom: '8px' }
const subStyle = { fontSize: '15px', color: 'rgba(255,255,255,0.45)' }
