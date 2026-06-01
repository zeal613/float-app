import { useState, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

export default function ReceiptScanner({ onClose, onSaved }) {
  const { user } = useAuth()
  const [step, setStep] = useState('options') // options|preview|scanning|review|done
  const [imageData, setImageData] = useState(null)
  const [scanned, setScanned] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const cameraRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setImageData(e.target.result)
      setStep('preview')
    }
    reader.readAsDataURL(file)
  }

  const scanReceipt = async () => {
    if (!imageData) return
    setLoading(true)
    setStep('scanning')
    setError('')

    try {
      const base64 = imageData.split(',')[1]
      const mediaType = imageData.split(';')[0].split(':')[1]

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 }
              },
              {
                type: 'text',
                text: `Analyze this receipt image. Extract ALL expense items.
Return ONLY valid JSON, no other text:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD or today if not visible",
  "total": 0,
  "currency": "KES",
  "category": "Food|Shopping|Transport|Bills|Health|Entertainment|Other",
  "items": [
    {"name": "item name", "amount": 0}
  ],
  "confidence": "high|medium|low"
}
If no receipt is visible, return: {"error": "No receipt found"}`
              }
            ]
          }]
        })
      })

      const data = await response.json()
      const text = data.content?.[0]?.text || '{}'
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)

      if (parsed.error) {
        setError('No receipt found in image. Please try again with a clearer photo.')
        setStep('options')
      } else {
        setScanned(parsed)
        setStep('review')
      }
    } catch (e) {
      setError('Could not read the receipt. Please try again or enter manually.')
      setStep('options')
    }
    setLoading(false)
  }

  const saveExpense = async () => {
    if (!scanned || !user) return
    setLoading(true)

    const { data: acc } = await supabase.from('accounts')
      .select('id, balance').eq('user_id', user.id)
      .eq('is_primary', true).single()

    await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: acc?.id,
      name: scanned.merchant || 'Receipt',
      amount: -scanned.total,
      type: 'expense',
      category: scanned.category || 'Shopping',
      note: `Receipt scan: ${scanned.items?.map(i => i.name).join(', ')}`,
      date: scanned.date ? new Date(scanned.date).toISOString() : new Date().toISOString(),
      is_mpesa: false
    })

    if (acc) {
      await supabase.from('accounts')
        .update({ balance: (acc.balance || 0) - scanned.total })
        .eq('id', acc.id)
    }

    setLoading(false)
    onSaved?.()
    onClose()
  }

  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet">
        <div className="drag-handle" />

        <h3 style={{ fontSize: '20px', fontWeight: 800,
          letterSpacing: '-0.5px', marginBottom: '4px' }}>
          Scan Receipt
        </h3>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)',
          marginBottom: '20px' }}>
          Take a photo or upload — AI reads it automatically.
        </p>

        {error && (
          <div style={{ padding: '12px 14px', background: 'rgba(255,80,80,0.08)',
            border: '1px solid rgba(255,80,80,0.15)', borderRadius: '12px',
            marginBottom: '16px', fontSize: '13px',
            color: 'rgba(255,120,120,0.9)' }}>{error}</div>
        )}

        {/* Options step */}
        {step === 'options' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
            <input ref={fileRef} type="file" accept="image/*"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />

            <button onClick={() => cameraRef.current?.click()}
              className="btn"
              style={{
                height: '64px', borderRadius: '16px', gap: '12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFF', fontSize: '16px', fontWeight: 600
              }}>
              <span style={{ fontSize: '28px' }}>📷</span>
              Take a photo
            </button>

            <button onClick={() => fileRef.current?.click()}
              className="btn"
              style={{
                height: '64px', borderRadius: '16px', gap: '12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFF', fontSize: '16px', fontWeight: 600
              }}>
              <span style={{ fontSize: '28px' }}>🖼</span>
              Upload from gallery
            </button>

            <p style={{ textAlign: 'center', fontSize: '12px',
              color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
              Works with M-Pesa receipts, supermarket slips, restaurant bills
            </p>
          </div>
        )}

        {/* Preview step */}
        {step === 'preview' && imageData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ borderRadius: '14px', overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)', maxHeight: '300px' }}>
              <img src={imageData} alt="Receipt"
                style={{ width: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
            <button className="btn btn-white" onClick={scanReceipt}>
              Read Receipt with AI →
            </button>
            <button className="btn btn-ghost" onClick={() => setStep('options')}>
              Choose different image
            </button>
          </div>
        )}

        {/* Scanning step */}
        {step === 'scanning' && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px',
              animation: 'pulse 1s ease-in-out infinite' }}>🔍</div>
            <p style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
              Reading your receipt...
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              AI is extracting all items and amounts
            </p>
          </div>
        )}

        {/* Review step */}
        {step === 'review' && scanned && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 800,
                    letterSpacing: '-0.5px' }}>{scanned.merchant}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)',
                    marginTop: '2px' }}>
                    {scanned.category} · {scanned.date || 'Today'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '22px', fontWeight: 900,
                    letterSpacing: '-1px' }}>
                    KES {(scanned.total || 0).toLocaleString('en-KE')}
                  </p>
                  <p style={{ fontSize: '10px',
                    color: scanned.confidence === 'high'
                      ? 'rgba(100,255,150,0.7)'
                      : 'rgba(255,200,80,0.7)',
                    fontWeight: 700, letterSpacing: '0.5px',
                    textTransform: 'uppercase' }}>
                    {scanned.confidence} confidence
                  </p>
                </div>
              </div>

              {scanned.items?.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)',
                  paddingTop: '10px' }}>
                  {scanned.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex',
                      justifyContent: 'space-between', padding: '4px 0',
                      fontSize: '13px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.65)' }}>{item.name}</span>
                      <span style={{ fontWeight: 600 }}>
                        KES {(item.amount || 0).toLocaleString('en-KE')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-white" onClick={saveExpense}
              disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving...' : `Add KES ${(scanned.total||0).toLocaleString('en-KE')} expense`}
            </button>
            <button className="btn btn-ghost"
              onClick={() => setStep('options')}>
              Scan different receipt
            </button>
          </div>
        )}
      </div>
    </>
  )
}
