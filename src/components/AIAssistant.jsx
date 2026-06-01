import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useFloat } from '../hooks/useFloat'

const SUGGESTIONS = [
  "Am I spending too much this week?",
  "How can I improve my float?",
  "What bills should I prioritize?",
  "Give me a savings tip for today",
  "How does my spending compare to last week?",
]

export default function AIAssistant({ onClose }) {
  const { profile, user } = useAuth()
  const floatData = useFloat()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hey ${profile?.full_name?.split(' ')[0] || 'there'} 👋 I'm your FLOAT assistant. I can see your finances and help you make smart decisions. What's on your mind?`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildContext = () => {
    const { floatAmount, calmScore, riskLevel, totalBalance,
      upcomingBills, totalBillsDue, daysUntilPayday,
      emergencyReserve, spentToday, recentTransactions } = floatData

    const catBreakdown = recentTransactions
      .filter(t => t.amount < 0)
      .reduce((a, t) => { a[t.category] = (a[t.category]||0) + Math.abs(t.amount); return a }, {})

    return `
You are FLOAT, a personal financial assistant for ${profile?.full_name || 'the user'}, a Kenyan user.
Be warm, direct, and concise. Max 3 sentences per response unless asked for detail.
Never lecture. Always be encouraging. Use KES for currency.

USER'S CURRENT FINANCIAL SNAPSHOT:
- Float today: KES ${floatAmount.toLocaleString('en-KE')} (safe daily spending)
- M-Pesa balance: KES ${totalBalance.toLocaleString('en-KE')}
- Calm score: ${calmScore}/100 (${riskLevel})
- Emergency reserve: KES ${emergencyReserve.toLocaleString('en-KE')}
- Days until payday: ${daysUntilPayday}
- Spent today: KES ${spentToday.toLocaleString('en-KE')}
- Upcoming bills (14 days): KES ${totalBillsDue.toLocaleString('en-KE')}
- Bills: ${upcomingBills.map(b => `${b.name} KES ${b.amount} due in ${Math.ceil((new Date(b.due_date)-new Date())/86400000)} days`).join(', ') || 'none'}
- Recent spending by category: ${JSON.stringify(catBreakdown)}
- Recent transactions: ${recentTransactions.slice(0,5).map(t => `${t.name} ${t.amount > 0 ? '+' : ''}KES ${t.amount}`).join(', ')}
`
  }

  const send = async (text) => {
    const userMsg = text || input.trim()
    if (!userMsg) return
    setInput('')
    setLoading(true)

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildContext(),
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })
      const data = await response.json()
      const reply = data.content?.[0]?.text || "Sorry, I couldn't process that. Try again."
      setMessages(p => [...p, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(p => [...p, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Check your internet and try again."
      }])
    }
    setLoading(false)
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet" style={{ height: '80vh', display: 'flex',
        flexDirection: 'column', padding: '0' }}>
        <div style={{ padding: '0 20px' }}>
          <div className="drag-handle" />
          <div style={{ display: 'flex', alignItems: 'center',
            gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px' }}>🤖</div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 800 }}>FLOAT Assistant</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                Knows your finances · Always available
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px',
          display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                maxWidth: '82%', padding: '12px 14px',
                borderRadius: m.role === 'user'
                  ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.role === 'user'
                  ? '#FFFFFF' : 'rgba(255,255,255,0.07)',
                border: m.role === 'user'
                  ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: m.role === 'user' ? '#000' : '#FFF',
                fontSize: '14px', lineHeight: 1.6
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '12px 16px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px 16px 16px 4px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.5)',
                      animation: `pulse 1.4s ease-in-out ${i*0.2}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div style={{ padding: '10px 20px',
            display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                style={{
                  padding: '8px 12px', borderRadius: '20px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)', fontSize: '12px',
                  fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: 'inherit'
                }}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 20px 20px',
          display: 'flex', gap: '10px', alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <input
            className="input"
            placeholder="Ask anything about your money..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="btn"
            style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: input.trim() && !loading
                ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
              color: input.trim() && !loading ? '#000' : 'rgba(255,255,255,0.3)',
              fontSize: '18px', flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s'
            }}>↑</button>
        </div>
      </div>
    </>
  )
}
