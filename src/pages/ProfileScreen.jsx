import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useFloat } from '../hooks/useFloat'
import { supabase } from '../lib/supabase'

export default function ProfileScreen({ onNavigate }) {
  const { user, profile, signOut, updateProfile } = useAuth()
  const { recentTransactions, totalBalance } = useFloat()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    payday: profile?.payday_date || 25,
    reserve: profile?.emergency_reserve_target || 5000,
  })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const firstName = profile?.full_name?.split(' ')[0] || 'Friend'
  const initials = (profile?.full_name || 'F')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const save = async () => {
    setSaving(true)
    await updateProfile({
      payday_date: parseInt(form.payday),
      emergency_reserve_target: parseFloat(form.reserve)
    })
    setSaving(false)
    setEditing(false)
  }

  const deleteAccount = async () => {
    await supabase.from('transactions').delete().eq('user_id', user.id)
    await supabase.from('bills').delete().eq('user_id', user.id)
    await supabase.from('accounts').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)
    await signOut()
  }

  const exportCSV = () => {
    const rows = [['Date','Name','Category','Amount','Type']]
    recentTransactions.forEach(t => {
      rows.push([
        new Date(t.date).toLocaleDateString('en-KE'),
        t.name, t.category, t.amount, t.type
      ])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'float-transactions.csv'; a.click()
  }

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '8px' }}>
      <p className="section-label" style={{ marginBottom: '8px',
        padding: '0 4px' }}>{title}</p>
      <div className="glass" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )

  const Row = ({ icon, label, value, onTap, danger }) => (
    <div onClick={onTap} style={{
      display: 'flex', alignItems: 'center', padding: '16px 20px',
      gap: '14px', cursor: onTap ? 'pointer' : 'default',
      borderBottom: '1px solid rgba(255,255,255,0.05)'
    }}>
      <span style={{ fontSize: '20px', width: '24px',
        textAlign: 'center' }}>{icon}</span>
      <p style={{ flex: 1, fontSize: '15px', fontWeight: 500,
        color: danger ? 'rgba(255,100,100,0.9)' : '#FFF' }}>{label}</p>
      {value && <p style={{ fontSize: '14px',
        color: 'rgba(255,255,255,0.4)' }}>{value}</p>}
      {onTap && <span style={{ color: 'rgba(255,255,255,0.25)',
        fontSize: '16px' }}>›</span>}
    </div>
  )

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ padding: '56px 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '18px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 800, letterSpacing: '-1px' }}>
            {initials}
          </div>
          <div>
            <p style={{ fontSize: '20px', fontWeight: 800,
              letterSpacing: '-0.5px' }}>{profile?.full_name || 'Friend'}</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)',
              marginTop: '2px' }}>{user?.email}</p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          {[
            { label: 'Transactions', val: recentTransactions.length },
            { label: 'Balance', val: `KES ${totalBalance.toLocaleString('en-KE')}` },
            { label: 'Member since', val: profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
              : '—' }
          ].map(s => (
            <div key={s.label} className="glass"
              style={{ flex: 1, padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '15px', fontWeight: 800,
                letterSpacing: '-0.3px', marginBottom: '2px' }}>{s.val}</p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)',
                fontWeight: 600, letterSpacing: '0.5px' }}>{s.label.toUpperCase()}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* FLOAT Settings */}
        {editing ? (
          <div className="glass" style={{ padding: '20px' }}>
            <p className="section-label" style={{ marginBottom: '16px' }}>EDIT SETTINGS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)',
                  marginBottom: '8px' }}>Payday date</p>
                <input className="input" type="number" min="1" max="31"
                  value={form.payday}
                  onChange={e => setForm(p => ({ ...p, payday: e.target.value }))} />
              </div>
              <div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)',
                  marginBottom: '8px' }}>Emergency reserve (KES)</p>
                <input className="input" type="number"
                  value={form.reserve}
                  onChange={e => setForm(p => ({ ...p, reserve: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }}
                  onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn btn-white" style={{ flex: 1 }}
                  onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <Section title="FLOAT SETTINGS">
            <Row icon="📅" label="Payday date"
              value={`${profile?.payday_date || 25}th of month`}
              onTap={() => setEditing(true)} />
            <Row icon="🔒" label="Emergency reserve"
              value={`KES ${(profile?.emergency_reserve_target || 5000).toLocaleString('en-KE')}`}
              onTap={() => setEditing(true)} />
          </Section>
        )}

        {/* Actions */}
        <Section title="ACTIONS">
          <Row icon="📲" label="Import M-Pesa SMS"
            onTap={() => onNavigate('import')} />
          <Row icon="📊" label="Export transactions CSV"
            onTap={exportCSV} />
        </Section>

        {/* Coming soon */}
        <Section title="CONNECTED SERVICES">
          <Row icon="📱" label="M-Pesa Auto-Sync" value="Coming soon" />
          <Row icon="🏦" label="Bank Sync" value="Coming soon" />
        </Section>

        {/* Support */}
        <Section title="SUPPORT">
          <Row icon="❓" label="Help & FAQ" />
          <Row icon="💬" label="Send feedback" />
          <Row icon="⭐" label="Rate FLOAT" />
        </Section>

        {/* Danger zone */}
        <div className="glass" style={{ padding: '0', borderRadius: '16px',
          overflow: 'hidden' }}>
          {deleteConfirm ? (
            <div style={{ padding: '20px' }}>
              <p style={{ fontWeight: 700, marginBottom: '8px' }}>
                Delete account?
              </p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)',
                marginBottom: '16px', lineHeight: 1.6 }}>
                This permanently deletes all your data. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }}
                  onClick={() => setDeleteConfirm(false)}>Cancel</button>
                <button className="btn" onClick={deleteAccount} style={{
                  flex: 1, height: '48px', background: 'rgba(255,60,60,0.15)',
                  border: '1px solid rgba(255,60,60,0.3)',
                  color: 'rgba(255,100,100,0.9)', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 700
                }}>Yes, Delete</button>
              </div>
            </div>
          ) : (
            <>
              <div onClick={signOut} style={{
                display: 'flex', alignItems: 'center', padding: '16px 20px',
                gap: '14px', cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <span style={{ fontSize: '20px' }}>🚪</span>
                <p style={{ flex: 1, fontSize: '15px', fontWeight: 600 }}>Sign Out</p>
              </div>
              <div onClick={() => setDeleteConfirm(true)} style={{
                display: 'flex', alignItems: 'center', padding: '16px 20px',
                gap: '14px', cursor: 'pointer'
              }}>
                <span style={{ fontSize: '20px' }}>🗑</span>
                <p style={{ flex: 1, fontSize: '15px', fontWeight: 500,
                  color: 'rgba(255,100,100,0.8)' }}>Delete Account</p>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px',
          color: 'rgba(255,255,255,0.2)', padding: '8px 0 16px' }}>
          FLOAT v1.0 · Made in Kenya 🇰🇪
        </p>
      </div>
    </div>
  )
}
