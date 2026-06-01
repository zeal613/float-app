import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'

const S = {
  page: {
    minHeight: '100vh', background: '#0A0A0A',
    display: 'flex', flexDirection: 'column',
    padding: '0 24px', animation: 'fadeIn 0.4s ease-out'
  },
  back: {
    background: 'none', border: 'none',
    color: 'rgba(255,255,255,0.5)', fontSize: '22px',
    cursor: 'pointer', padding: '56px 0 24px',
    alignSelf: 'flex-start', lineHeight: 1, fontFamily: 'inherit'
  },
  error: {
    color: 'rgba(255,120,120,0.95)', fontSize: '14px',
    padding: '12px 16px', background: 'rgba(255,80,80,0.08)',
    border: '1px solid rgba(255,80,80,0.15)',
    borderRadius: '12px', lineHeight: 1.5
  }
}

/* ── WELCOME ── */
export function Welcome({ onSignUp, onSignIn }) {
  return (
    <div style={{
      ...S.page, alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px calc(env(safe-area-inset-bottom,0px) + 56px)'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px' }}>

        <div style={{ fontSize: '88px', fontWeight: 900,
          letterSpacing: '-6px', lineHeight: 0.88,
          color: '#FFFFFF', textAlign: 'center' }}>
          FLOAT
        </div>

        <svg width="72" height="18" viewBox="0 0 72 18">
          <path d="M2 9 C10 3,18 15,26 9 C34 3,42 15,50 9 C58 3,66 15,70 9"
            stroke="rgba(255,255,255,0.35)" strokeWidth="2.5"
            fill="none" strokeLinecap="round" />
        </svg>

        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <p style={{ fontSize: '22px', fontWeight: 700,
            color: '#FFF', letterSpacing: '-0.5px', marginBottom: '6px' }}>
            Know what you can spend.
          </p>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.4)',
            fontWeight: 400 }}>
            Every single day.
          </p>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column',
          gap: '6px', alignItems: 'center' }}>
          {['M-Pesa aware', 'No budgets to fill', 'One daily number'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.3)' }} />
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button className="btn btn-white" onClick={onSignUp}>Create Account</button>
        <button className="btn btn-ghost" onClick={onSignIn}>Sign In</button>
        <p style={{ textAlign: 'center', fontSize: '12px',
          color: 'rgba(255,255,255,0.25)', marginTop: '8px' }}>
          Made in Kenya 🇰🇪
        </p>
      </div>
    </div>
  )
}

/* ── SIGN UP ── */
export function SignUp({ onBack, onSuccess, onSignIn }) {
  const { signUp } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    setError('')
    if (!form.name.trim()) return setError('Please enter your full name.')
    if (!form.email.includes('@')) return setError('Please enter a valid email.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')

    setLoading(true)
    const { error: e } = await signUp(form.email, form.password, form.name, form.phone)
    setLoading(false)
    if (e) setError(e.message.includes('already registered')
      ? 'This email is already registered. Try signing in.'
      : e.message)
    else onSuccess()
  }

  return (
    <div style={S.page}>
      <button style={S.back} onClick={onBack}>←</button>
      <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '6px' }}>
        Create your account
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginBottom: '28px' }}>
        Takes less than 2 minutes.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input className="input" placeholder="Full name"
          value={form.name} onChange={e => set('name', e.target.value)} />
        <input className="input" type="email" placeholder="Email address"
          value={form.email} onChange={e => set('email', e.target.value)}
          autoCapitalize="none" />
        <div style={{ position: 'relative' }}>
          <input className="input" type={showPw ? 'text' : 'password'}
            placeholder="Password (min. 6 characters)"
            value={form.password} onChange={e => set('password', e.target.value)}
            style={{ paddingRight: '60px' }} />
          <button onClick={() => setShowPw(p => !p)} style={{
            position: 'absolute', right: '16px', top: '50%',
            transform: 'translateY(-50%)', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.4)', fontSize: '12px',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
            letterSpacing: '0.5px'
          }}>{showPw ? 'HIDE' : 'SHOW'}</button>
        </div>
        <input className="input" type="tel" placeholder="Phone number (07XXXXXXXX)"
          value={form.phone} onChange={e => set('phone', e.target.value)} />

        {error && <p style={S.error}>{error}</p>}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '24px',
        paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)' }}>
        <button className="btn btn-white" onClick={submit}
          disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)',
          fontSize: '14px', marginTop: '16px' }}>
          Already have an account?{' '}
          <span onClick={onSignIn} style={{ color: '#FFF', cursor: 'pointer', fontWeight: 700 }}>
            Sign In
          </span>
        </p>
      </div>
    </div>
  )
}

/* ── SIGN IN ── */
export function SignIn({ onBack, onSuccess, onSignUp, onForgot }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    if (!email.trim()) return setError('Please enter your email.')
    if (!password) return setError('Please enter your password.')
    setLoading(true)
    const { error: e } = await signIn(email, password)
    setLoading(false)
    if (e) setError('Incorrect email or password.')
    else onSuccess()
  }

  return (
    <div style={S.page}>
      <button style={S.back} onClick={onBack}>←</button>
      <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '6px' }}>
        Welcome back
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginBottom: '28px' }}>
        Good to see you again.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input className="input" type="email" placeholder="Email address"
          value={email} onChange={e => setEmail(e.target.value)} autoCapitalize="none" />
        <div style={{ position: 'relative' }}>
          <input className="input" type={showPw ? 'text' : 'password'}
            placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ paddingRight: '60px' }}
            onKeyDown={e => e.key === 'Enter' && submit()} />
          <button onClick={() => setShowPw(p => !p)} style={{
            position: 'absolute', right: '16px', top: '50%',
            transform: 'translateY(-50%)', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.4)', fontSize: '12px',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700
          }}>{showPw ? 'HIDE' : 'SHOW'}</button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span onClick={onForgot} style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer'
          }}>Forgot password?</span>
        </div>
        {error && <p style={S.error}>{error}</p>}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '24px',
        paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)' }}>
        <button className="btn btn-white" onClick={submit}
          disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)',
          fontSize: '14px', marginTop: '16px' }}>
          New to FLOAT?{' '}
          <span onClick={onSignUp} style={{ color: '#FFF', cursor: 'pointer', fontWeight: 700 }}>
            Create Account
          </span>
        </p>
      </div>
    </div>
  )
}

/* ── FORGOT PASSWORD ── */
export function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()

  const submit = async () => {
    if (!email.trim()) return setError('Please enter your email.')
    setLoading(true)
    const { supabase } = await import('../../lib/supabase')
    const { error: e } = await supabase.auth.resetPasswordForEmail(email)
    setLoading(false)
    if (e) setError(e.message)
    else setSent(true)
  }

  if (sent) return (
    <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', gap: '16px' }}>
      <div style={{ fontSize: '52px' }}>✉️</div>
      <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
        Check your email
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
        We sent a reset link to<br />
        <span style={{ color: '#FFF' }}>{email}</span>
      </p>
      <span onClick={onBack} style={{ color: 'rgba(255,255,255,0.4)',
        cursor: 'pointer', fontSize: '14px', marginTop: '8px' }}>
        ← Back to Sign In
      </span>
    </div>
  )

  return (
    <div style={S.page}>
      <button style={S.back} onClick={onBack}>←</button>
      <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '6px' }}>
        Reset password
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginBottom: '28px' }}>
        We'll send a reset link to your email.
      </p>
      <input className="input" type="email" placeholder="Email address"
        value={email} onChange={e => setEmail(e.target.value)} autoCapitalize="none" />
      {error && <p style={{ ...S.error, marginTop: '12px' }}>{error}</p>}
      <div style={{ marginTop: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 24px)' }}>
        <button className="btn btn-white" onClick={submit}
          disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </div>
    </div>
  )
}
