import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import SetupFlow from './pages/setup/SetupFlow'
import MainApp from './pages/MainApp'
import { Welcome, SignUp, SignIn, ForgotPassword } from './pages/auth/AuthPages'

function AppContent() {
  const { user, profile, loading } = useAuth()
  const [screen, setScreen] = useState('splash')

  useEffect(() => {
    if (loading) return
    if (!user) setScreen('welcome')
    else if (!profile?.onboarding_completed) setScreen('setup')
    else setScreen('app')
  }, [user, profile, loading])

  // Splash
  if (loading || screen === 'splash') return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{ fontSize: '64px', fontWeight: 900,
        letterSpacing: '-5px', color: '#FFFFFF', lineHeight: 1 }}>
        FLOAT
      </div>
      <svg width="64" height="16" viewBox="0 0 64 16" style={{ marginTop: '12px' }}>
        <path d="M2 8 C10 2,18 14,26 8 C34 2,42 14,50 8 C58 2,62 14,62 8"
          stroke="rgba(255,255,255,0.3)" strokeWidth="2"
          fill="none" strokeLinecap="round" />
      </svg>
    </div>
  )

  if (screen === 'app') return <MainApp />

  if (screen === 'setup') return (
    <SetupFlow onComplete={() => setScreen('app')} />
  )

  return (
    <div style={{ height: '100vh', background: '#0A0A0A', overflow: 'hidden' }}>
      {screen === 'welcome' && (
        <Welcome
          onSignUp={() => setScreen('signup')}
          onSignIn={() => setScreen('signin')}
        />
      )}
      {screen === 'signup' && (
        <SignUp
          onBack={() => setScreen('welcome')}
          onSuccess={() => setScreen('setup')}
          onSignIn={() => setScreen('signin')}
        />
      )}
      {screen === 'signin' && (
        <SignIn
          onBack={() => setScreen('welcome')}
          onSuccess={() => setScreen('app')}
          onSignUp={() => setScreen('signup')}
          onForgot={() => setScreen('forgot')}
        />
      )}
      {screen === 'forgot' && (
        <ForgotPassword onBack={() => setScreen('signin')} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
