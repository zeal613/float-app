import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Parse a single M-Pesa SMS string
export function parseSingleSMS(sms) {
  const result = {
    amount: 0, name: 'Unknown', type: '', ref: '',
    date: new Date().toISOString(), category: 'Other'
  }

  const refMatch = sms.match(/^([A-Z0-9]{10})\s/)
  if (refMatch) result.ref = refMatch[1]

  const amountMatch = sms.match(/[Kk]sh\s?([\d,]+\.?\d*)/)
  if (amountMatch) result.amount = parseFloat(amountMatch[1].replace(/,/g, ''))

  if (/received.*from/i.test(sms)) {
    result.type = 'income'
    const m = sms.match(/received\s+Ksh[\d,.]+\s+from\s+([A-Z][A-Z\s]+?)(?:\s+\d{9,}|\s+on)/i)
    if (m) result.name = m[1].trim()
    result.category = 'Income'
  } else if (/sent to/i.test(sms)) {
    result.type = 'expense'
    const m = sms.match(/sent\s+to\s+([A-Z][A-Z\s]+?)(?:\s+\d{9,}|\s+on)/i)
    if (m) result.name = m[1].trim()
  } else if (/paid to/i.test(sms)) {
    result.type = 'expense'
    const m = sms.match(/paid\s+to\s+\d+\s+([A-Z][A-Z\s]+?)\s+for/i)
    const m2 = sms.match(/paid\s+to\s+([A-Z][A-Z\s]+?)(?:\s+for|\s+on)/i)
    result.name = (m?.[1] || m2?.[1] || 'Bill Payment').trim()
    result.category = 'Bills'
  } else if (/withdrawn/i.test(sms)) {
    result.type = 'expense'; result.name = 'M-Pesa Withdrawal'; result.category = 'Cash'
  } else if (/airtime/i.test(sms)) {
    result.type = 'expense'; result.name = 'Airtime'; result.category = 'Airtime'
  }

  if (result.type !== 'income' && result.type !== 'expense') return null
  if (result.amount <= 0) return null

  // Auto-categorize
  const n = result.name.toLowerCase()
  if (result.type !== 'income') {
    if (/java|kfc|chicken|pizza|naivas|quickmart|carrefour|food|cafe/i.test(n)) result.category = 'Food'
    else if (/uber|bolt|little|cab/i.test(n)) result.category = 'Transport'
    else if (/safaricom|airtel|kplc|water|zuku|dstv|netflix|spotify/i.test(n)) result.category = 'Bills'
    else if (/hospital|pharmacy|clinic|nhif/i.test(n)) result.category = 'Health'
  }

  return result
}

// Hook: watches for new M-Pesa SMS pasted by user via clipboard or manual trigger
export function useSMSWatcher(userId, onNewTransaction) {
  // Watch clipboard for M-Pesa messages
  const checkClipboard = useCallback(async () => {
    try {
      if (!navigator.clipboard?.readText) return
      const text = await navigator.clipboard.readText()
      if (!text || text.length < 20) return

      // Check if it looks like M-Pesa
      if (!/[Kk]sh[\d,]+/.test(text)) return
      if (!/[Cc]onfirmed|[Mm]-?[Pp]esa/i.test(text)) return

      const parsed = parseSingleSMS(text)
      if (!parsed || !userId) return

      // Check if already imported (by ref)
      if (parsed.ref) {
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('mpesa_ref', parsed.ref)
          .single()
        if (existing) return
      }

      onNewTransaction(parsed)
    } catch (e) {
      // Clipboard access denied — silent fail
    }
  }, [userId, onNewTransaction])

  // Check when app comes back to foreground
  useEffect(() => {
    const onFocus = () => checkClipboard()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) checkClipboard()
    })
    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [checkClipboard])
}
