import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

function parseMpesaSMS(rawText) {
  const chunks = rawText.split(/\n{2,}|(?=[A-Z0-9]{10}\s+Confirmed)/)
    .map(s => s.trim()).filter(s => s.length > 10)

  return chunks.map(sms => {
    const result = {
      amount: 0, name: 'Unknown', type: '', ref: '',
      date: new Date().toISOString(), category: 'Other', raw: sms
    }

    const refMatch = sms.match(/^([A-Z0-9]{10})\s/)
    if (refMatch) result.ref = refMatch[1]

    const amountMatch = sms.match(/[Kk]sh\s?([\d,]+\.?\d*)/)
    if (amountMatch) result.amount = parseFloat(amountMatch[1].replace(/,/g, ''))

    const dateMatch = sms.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i)
    if (dateMatch) {
      try { result.date = new Date(`${dateMatch[1]} ${dateMatch[2]}`).toISOString() } catch(e) {}
    }

    if (/received.*from/i.test(sms)) {
      result.type = 'income'
      const m = sms.match(/received\s+Ksh[\d,.]+\s+from\s+([A-Z][A-Z\s]+?)(?:\s+\d{9,}|\s+on)/i)
      if (m) result.name = m[1].trim()
    } else if (/sent to/i.test(sms)) {
      result.type = 'expense'
      const m = sms.match(/sent\s+to\s+([A-Z][A-Z\s]+?)(?:\s+\d{9,}|\s+on)/i)
      if (m) result.name = m[1].trim()
    } else if (/paid to/i.test(sms)) {
      result.type = 'expense'
      const m = sms.match(/paid\s+to\s+\d+\s+([A-Z][A-Z\s]+?)\s+for/i)
      const m2 = sms.match(/paid\s+to\s+([A-Z][A-Z\s]+?)(?:\s+for|\s+on)/i)
      result.name = (m?.[1] || m2?.[1] || 'Bill Payment').trim()
    } else if (/withdrawn/i.test(sms)) {
      result.type = 'expense'; result.name = 'M-Pesa Withdrawal'; result.category = 'Cash'
    } else if (/airtime/i.test(sms)) {
      result.type = 'expense'; result.name = 'Airtime'; result.category = 'Airtime'
    } else if (/bought.*goods/i.test(sms)) {
      result.type = 'expense'
      const m = sms.match(/paid\s+to\s+([A-Z][A-Z\s]+?)(?:\.|$)/i)
      if (m) result.name = m[1].trim()
    }

    if (result.type === 'income') result.category = 'Income'
    else if (/java|kfc|chicken|pizza|subway|artcaffe|food|naivas|quickmart|carrefour|chandarana/i.test(result.name))
      result.category = 'Food'
    else if (/uber|bolt|little|cab|transport/i.test(result.name))
      result.category = 'Transport'
    else if (/safaricom|airtel|kplc|water|zuku|dstv|netflix|spotify|showmax|faiba/i.test(result.name))
      result.category = 'Bills'
    else if (/hospital|pharmacy|clinic|doctor|nhif|aar|jubilee/i.test(result.name))
      result.category = 'Health'
    else if (/equity|kcb|cooperative|ncba|absa|stanbic|family.*bank/i.test(result.name))
      result.category = 'Banking'

    return result
  }).filter(t => t.amount > 0 && t.type !== '')
}

export default function MpesaImport({ onBack, onComplete }) {
  const { user } = useAuth()
  const [step, setStep] = useState(0) // 0=instructions, 1=paste, 2=review, 3=success
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState([])
  const [loading, setLoading] = useState(false)
  const [imported, setImported] = useState(0)

  const parse = () => {
    const results = parseMpesaSMS(rawText)
    setParsed(results)
    setStep(2)
  }

  const importAll = async () => {
    if (!user || parsed.length === 0) return
    setLoading(true)

    const { data: acc } = await supabase.from('accounts')
      .select('id, balance').eq('user_id', user.id).eq('is_primary', true).single()

    // Insert transactions
    const txRows = parsed.map(t => ({
      user_id: user.id,
      account_id: acc?.id,
      name: t.name, amount: t.type === 'income' ? t.amount : -t.amount,
      type: t.type, category: t.category,
      date: t.date, is_mpesa: true, mpesa_ref: t.ref
    }))

    await supabase.from('transactions').insert(txRows)

    // Update balance
    if (acc) {
      const netChange = parsed.reduce((s, t) =>
        s + (t.type === 'income' ? t.amount : -t.amount), 0)
      await supabase.from('accounts')
        .update({ balance: (acc.balance || 0) + netChange })
        .eq('id', acc.id)
    }

    setImported(parsed.length)
    setLoading(false)
    setStep(3)
  }

  const incomeCount = parsed.filter(t => t.type === 'income').length
  const expenseCount = parsed.filter(t => t.type === 'expense').length
  const incomeTotal = parsed.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0)
  const expenseTotal = parsed.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0)

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', paddingBottom: '40px' }}>
      <div style={{ padding: '56px 24px 24px',
        display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={onBack} className="btn"
          style={{ width: '40px', height: '40px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '18px', color: '#FFF', flexShrink: 0 }}>
          ←
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Import M-Pesa
        </h1>
      </div>

      {/* Step 0 — Instructions */}
      {step === 0 && (
        <div style={{ padding: '0 24px', animation: 'slideUp 0.4s ease-out' }}>
          <div className="glass" style={{ padding: '24px', marginBottom: '20px' }}>
            <p style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px',
              letterSpacing: '-0.3px' }}>How to copy your M-Pesa messages</p>
            {[
              { n: '1', text: 'Open your Messages app' },
              { n: '2', text: 'Search for "M-Pesa" or "Safaricom"' },
              { n: '3', text: 'Long press any message → Select All' },
              { n: '4', text: 'Tap Copy' },
              { n: '5', text: 'Come back here and paste them below' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: '14px',
                alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>{s.n}</div>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)',
                  paddingTop: '4px', lineHeight: 1.4 }}>{s.text}</p>
              </div>
            ))}
          </div>
          <button className="btn btn-white" onClick={() => setStep(1)}>
            I've copied my messages →
          </button>
        </div>
      )}

      {/* Step 1 — Paste */}
      {step === 1 && (
        <div style={{ padding: '0 24px', animation: 'slideUp 0.4s ease-out' }}>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)',
            marginBottom: '12px', lineHeight: 1.6 }}>
            Paste all your M-Pesa messages below. FLOAT reads them automatically.
          </p>
          <textarea
            className="input"
            placeholder={`Paste your M-Pesa messages here...\n\nExample:\nZK4M2L8P Confirmed. You have received Ksh1,500.00 from JOHN DOE on 15/5/24 at 2:30 PM\n\nRL4M8K2Q Confirmed. Ksh500.00 sent to JANE SMITH on 15/5/24...`}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            style={{ height: '300px', resize: 'none', lineHeight: 1.6,
              fontFamily: 'DM Mono, monospace', fontSize: '13px' }}
          />
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)',
            marginTop: '8px', marginBottom: '20px' }}>
            {rawText.length > 0
              ? `${rawText.length} characters · ~${Math.floor(rawText.split('Confirmed').length - 1)} messages detected`
              : 'Paste your messages above'}
          </p>
          <button className="btn btn-white" onClick={parse}
            disabled={rawText.trim().length < 20}
            style={{ opacity: rawText.trim().length < 20 ? 0.4 : 1 }}>
            Parse Messages →
          </button>
        </div>
      )}

      {/* Step 2 — Review */}
      {step === 2 && (
        <div style={{ padding: '0 24px', animation: 'slideUp 0.4s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '10px', marginBottom: '20px' }}>
            <div className="glass" style={{ padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '28px', fontWeight: 900, marginBottom: '4px' }}>
                {incomeCount}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)',
                marginBottom: '4px' }}>Income</p>
              <p style={{ fontSize: '14px', fontWeight: 700 }}>
                +KES {incomeTotal.toLocaleString('en-KE')}
              </p>
            </div>
            <div className="glass" style={{ padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '28px', fontWeight: 900, marginBottom: '4px' }}>
                {expenseCount}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)',
                marginBottom: '4px' }}>Expenses</p>
              <p style={{ fontSize: '14px', fontWeight: 700 }}>
                -KES {expenseTotal.toLocaleString('en-KE')}
              </p>
            </div>
          </div>

          {parsed.length === 0 ? (
            <div className="glass" style={{ padding: '24px', textAlign: 'center',
              marginBottom: '20px' }}>
              <p style={{ fontSize: '24px', marginBottom: '12px' }}>🤔</p>
              <p style={{ fontWeight: 700, marginBottom: '8px' }}>
                No transactions found
              </p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.6 }}>
                Make sure you pasted M-Pesa confirmation messages.
              </p>
              <button className="btn btn-ghost" onClick={() => setStep(1)}
                style={{ marginTop: '16px' }}>← Try again</button>
            </div>
          ) : (
            <>
              <p className="section-label" style={{ marginBottom: '10px' }}>
                PREVIEW ({parsed.length} total)
              </p>
              <div className="glass" style={{ marginBottom: '20px',
                borderRadius: '16px', overflow: 'hidden' }}>
                {parsed.slice(0, 8).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center',
                    padding: '12px 16px', gap: '12px',
                    borderBottom: i < 7 && i < parsed.length - 1
                      ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{t.name}</p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        {t.category}
                      </p>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 700,
                      color: t.type === 'income' ? '#FFF' : 'rgba(255,255,255,0.6)' }}>
                      {t.type === 'income' ? '+' : '-'}KES {t.amount.toLocaleString('en-KE')}
                    </p>
                  </div>
                ))}
                {parsed.length > 8 && (
                  <div style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                      +{parsed.length - 8} more transactions
                    </p>
                  </div>
                )}
              </div>

              <button className="btn btn-white" onClick={importAll}
                disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Importing...' : `Import ${parsed.length} Transactions`}
              </button>
              <button className="btn btn-ghost" onClick={() => setStep(1)}
                style={{ marginTop: '10px' }}>← Try again</button>
            </>
          )}
        </div>
      )}

      {/* Step 3 — Success */}
      {step === 3 && (
        <div style={{ padding: '0 24px', textAlign: 'center',
          animation: 'scaleIn 0.4s ease-out' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px',
            animation: 'celebrate 0.5s ease-out' }}>🌊</div>
          <h2 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-1px',
            marginBottom: '8px' }}>Done!</h2>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)',
            marginBottom: '32px', lineHeight: 1.6 }}>
            {imported} transactions imported.<br />
            Your float is now up to date.
          </p>
          <button className="btn btn-white" onClick={onComplete}>
            See my float →
          </button>
        </div>
      )}
    </div>
  )
}
