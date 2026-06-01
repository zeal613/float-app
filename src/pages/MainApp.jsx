import { useState } from 'react'
import HomeScreen from './HomeScreen'
import ActivityScreen from './ActivityScreen'
import InsightsScreen from './InsightsScreen'
import SafeScreen from './SafeScreen'
import ProfileScreen from './ProfileScreen'
import MpesaImport from './MpesaImport'

const tabs = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'activity', label: 'Activity', icon: '📊' },
  { id: 'insights', label: 'Insights', icon: '💡' },
  { id: 'safe', label: 'Vault', icon: '🔒' },
  { id: 'profile', label: 'Profile', icon: '👤' },
]

export default function MainApp() {
  const [activeTab, setActiveTab] = useState('home')
  const [showImport, setShowImport] = useState(false)

  if (showImport) return (
    <MpesaImport
      onBack={() => setShowImport(false)}
      onComplete={() => { setShowImport(false); setActiveTab('home') }}
    />
  )

  const navigate = (dest) => {
    if (dest === 'import') setShowImport(true)
    else setActiveTab(dest)
  }

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh' }}>
      {activeTab === 'home' && <HomeScreen onNavigate={navigate} />}
      {activeTab === 'activity' && <ActivityScreen />}
      {activeTab === 'insights' && <InsightsScreen />}
      {activeTab === 'safe' && <SafeScreen />}
      {activeTab === 'profile' && <ProfileScreen onNavigate={navigate} />}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {tabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="btn"
              style={{
                flex: 1, flexDirection: 'column', gap: '4px',
                height: '64px', background: 'none', border: 'none',
                color: active ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                fontSize: '20px'
              }}>
              <span style={{ fontSize: '20px',
                filter: active ? 'none' : 'grayscale(1) opacity(0.5)',
                transition: 'filter 0.2s' }}>{tab.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.5px', textTransform: 'uppercase',
                transition: 'color 0.2s' }}>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
