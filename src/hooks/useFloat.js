import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function useFloat() {
  const { user, profile } = useAuth()
  const [state, setState] = useState({
    floatAmount: 0, calmScore: 50, riskLevel: 'CAUTION',
    totalBalance: 0, upcomingBills: [], totalBillsDue: 0,
    daysUntilPayday: 7, emergencyReserve: 5000,
    spentToday: 0, recentTransactions: [], floatHistory: [],
    notifications: [], unreadCount: 0, isLoading: true
  })

  const calculate = useCallback(async () => {
    if (!user || !profile) return
    try {
      const today = new Date()
      const in14 = new Date(); in14.setDate(today.getDate() + 14)
      const startOfDay = new Date(); startOfDay.setHours(0,0,0,0)

      const [accRes, billRes, txTodayRes, txRecentRes, snapRes, notifRes] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('bills').select('*').eq('user_id', user.id)
          .eq('is_paid', false).lte('due_date', in14.toISOString().split('T')[0])
          .order('due_date'),
        supabase.from('transactions').select('*').eq('user_id', user.id)
          .gte('date', startOfDay.toISOString()).order('date', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', user.id)
          .order('date', { ascending: false }).limit(30),
        supabase.from('float_snapshots').select('*').eq('user_id', user.id)
          .order('snapshot_date', { ascending: false }).limit(7),
        supabase.from('notifications').select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(20)
      ])

      const totalBalance = (accRes.data || []).reduce((s, a) => s + (a.balance || 0), 0)
      const bills = billRes.data || []
      const totalBillsDue = bills.reduce((s, b) => s + (b.amount || 0), 0)
      const emergencyReserve = profile.emergency_reserve_target || 5000

      const paydayDate = profile.payday_date || 25
      let daysUntilPayday = paydayDate - today.getDate()
      if (daysUntilPayday <= 0) daysUntilPayday += 30
      daysUntilPayday = Math.max(1, daysUntilPayday)

      const safe = totalBalance - totalBillsDue - emergencyReserve
      const floatAmount = Math.max(0, Math.round(safe / daysUntilPayday))

      const spentToday = (txTodayRes.data || [])
        .filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

      // Calm score
      let calm = 100
      if (floatAmount <= 0) calm -= 35
      else if (floatAmount < 300) calm -= 20
      else if (floatAmount < 700) calm -= 10
      if (totalBalance < emergencyReserve) calm -= 20
      const overdue = bills.filter(b => new Date(b.due_date) < today)
      calm -= overdue.length * 15
      const urgent = bills.filter(b => {
        const diff = (new Date(b.due_date) - today) / 86400000
        return diff >= 0 && diff <= 2
      })
      calm -= urgent.length * 5
      calm = Math.max(0, Math.min(100, calm))
      const riskLevel = calm >= 70 ? 'SAFE' : calm >= 40 ? 'CAUTION' : 'AT RISK'

      const unreadCount = (notifRes.data || []).filter(n => !n.is_read).length

      setState({
        floatAmount, calmScore: calm, riskLevel,
        totalBalance, upcomingBills: bills, totalBillsDue,
        daysUntilPayday, emergencyReserve, spentToday,
        recentTransactions: txRecentRes.data || [],
        floatHistory: (snapRes.data || []).reverse().map(s => s.float_amount),
        notifications: notifRes.data || [],
        unreadCount, isLoading: false
      })

      // Save daily snapshot (ignore duplicate errors)
      supabase.from('float_snapshots').upsert({
        user_id: user.id, float_amount: floatAmount,
        calm_score: calm, balance_total: totalBalance,
        bills_total: totalBillsDue,
        snapshot_date: today.toISOString().split('T')[0]
      }, { onConflict: 'user_id,snapshot_date', ignoreDuplicates: false })
        .then(() => {})

    } catch (e) {
      console.error('Float calc error', e)
      setState(p => ({ ...p, isLoading: false }))
    }
  }, [user, profile])

  useEffect(() => {
    if (!user) return
    calculate()
    const ch = supabase.channel(`float_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, calculate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${user.id}` }, calculate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `user_id=eq.${user.id}` }, calculate)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, calculate])

  return { ...state, refresh: calculate }
}
