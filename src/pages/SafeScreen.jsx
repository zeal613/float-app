import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useFloat } from '../hooks/useFloat'

export default function SafeScreen() {
  const { profile } = useAuth()
  const { totalBalance, emergencyReserve, upcomingBills } = useFloat()
  const [safeModeOn, setSafeModeOn] = useState(false)

  const monthlyBills = upcomingBills.reduce((s, b) => s + b.amount, 0)
  const monthsCovered = monthlyBills > 0
    ? Math.floor(emergencyReserve / monthlyBills) : '∞'

  const tips = [
    { icon: '⏸', text: 'Pause subscriptions you don\'t use daily.' },
    { icon: '🍽', text: 'Limit eating out to twice this week.' },
    { icon: '⏳', text: 'Delay non-essential purchases until payday.' },
    { icon: '📦', text: 'Cook at home — save KES 500–1,000 this week.' },
  ]

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '100px' }}>

      {safeModeOn && (
        <div style={{ background: 'rgba(255,220,80,0.1)',
          borderBottom: '1px solid rgba(255,220,80,0.2)',
          padding: '12px 24px', display: 'flex',
          alignItems: 'center', gap: '8px',
          animation: 'slideUp 0.3s ease-out' }}>
          <span>⚡</span>
          <p style={{ fontSize: '13px', fontWeight: 600,
            color: 'rgba(255,220,80,0.9)' }}>
            Safe Mode Active — spending conservatively
          </p>
        </div>
      )}

      <div style={{ padding: '56px 24px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px',
          filter: safeModeOn ? 'none' : 'grayscale(0.3)' }}>🔒</div>
        <h1 style={{ fontSize: '28px', fontWeight: 900,
          letterSpacing: '-1px', marginBottom: '4px' }}>The Vault</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>
          Your emergency reserve. Always protected.
        </p>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Reserve card */}
        <div className="glass" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)',
            fontWeight: 500, marginBottom: '8px' }}>Emergency Reserve</p>
          <p style={{ fontSize: '52px', fontWeight: 900,
            letterSpacing: '-3px', lineHeight: 1, marginBottom: '8px' }}>
            KES {emergencyReserve.toLocaleString('en-KE')}
          </p>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.6 }}>
            Covers your next{' '}
            <span style={{ color: '#FFF', fontWeight: 700 }}>
              {monthsCovered} month{monthsCovered !== 1 && monthsCovered !== '∞' ? 's' : ''}
            </span>{' '}
            of committed bills
          </p>
        </div>

        {/* Coverage breakdown */}
        {upcomingBills.length > 0 && (
          <div className="glass" style={{ padding: '20px' }}>
            <p className="section-label" style={{ marginBottom: '12px' }}>COVERAGE BREAKDOWN</p>
            {upcomingBills.slice(0, 5).map(bill => {
              const covered = bill.amount > 0
                ? Math.floor(emergencyReserve / bill.amount) : '∞'
              return (
                <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                    {bill.name}
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                    {covered} month{covered !== 1 && covered !== '∞' ? 's' : ''} covered
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Safe mode toggle */}
        <div className="glass" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 700 }}>Safe Mode</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)',
                marginTop: '2px' }}>Activates spending awareness</p>
            </div>
            <button onClick={() => setSafeModeOn(p => !p)}
              className="btn"
              style={{
                width: '52px', height: '28px', borderRadius: '14px', padding: 0,
                background: safeModeOn ? '#FFF' : 'rgba(255,255,255,0.15)',
                border: 'none', position: 'relative', flexShrink: 0,
                transition: 'background 0.25s'
              }}>
              <div style={{
                position: 'absolute', top: '4px',
                left: safeModeOn ? '26px' : '4px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: safeModeOn ? '#000' : '#FFF',
                transition: 'left 0.25s'
              }} />
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)',
            lineHeight: 1.6 }}>
            When Safe Mode is on, you'll see spending reminders throughout the day.
          </p>
        </div>

        {/* Tips (show when safe mode active) */}
        {safeModeOn && (
          <div className="glass" style={{ padding: '20px',
            animation: 'slideUp 0.3s ease-out' }}>
            <p className="section-label" style={{ marginBottom: '12px' }}>SPENDING TIPS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tips.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{t.icon}</span>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.5 }}>{t.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Balance vs Reserve */}
        <div className="glass" style={{ padding: '20px' }}>
          <p className="section-label" style={{ marginBottom: '12px' }}>RESERVE HEALTH</p>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                Reserve vs Balance
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>
                {totalBalance > 0
                  ? Math.round((emergencyReserve / totalBalance) * 100) : 0}%
              </span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)',
              borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px', background: '#FFF',
                width: `${totalBalance > 0
                  ? Math.min(100, (emergencyReserve / totalBalance) * 100) : 0}%`,
                transition: 'width 1s ease-out'
              }} />
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)',
            marginTop: '8px' }}>
            {totalBalance >= emergencyReserve
              ? '✅ Your reserve is fully funded.'
              : `⚠️ KES ${(emergencyReserve - totalBalance).toLocaleString('en-KE')} short of target.`}
          </p>
        </div>
      </div>
    </div>
  )
}
