import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthCtx = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchOrCreateProfile(u) {
    try {
      let { data, error } = await supabase
        .from('profiles').select('*').eq('id', u.id).single()

      if (error?.code === 'PGRST116' || !data) {
        const { data: created } = await supabase
          .from('profiles')
          .upsert({
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || 'Friend',
            onboarding_completed: false
          }, { onConflict: 'id' })
          .select().single()

        await supabase.from('accounts').upsert({
          user_id: u.id, name: 'M-Pesa',
          type: 'mpesa', balance: 0, is_primary: true
        }, { onConflict: 'user_id' })

        data = created
      }
      setProfile(data)
    } catch (e) {
      console.error('Profile error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchOrCreateProfile(u).finally(() => clearTimeout(timer))
      else { clearTimeout(timer); setLoading(false) }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) { setLoading(true); fetchOrCreateProfile(u) }
        else { setProfile(null); setLoading(false) }
      }
    )
    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  const signUp = (email, pass, name, phone) =>
    supabase.auth.signUp({ email, password: pass,
      options: { data: { full_name: name, phone_number: phone } } })

  const signIn = (email, pass) =>
    supabase.auth.signInWithPassword({ email, password: pass })

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null); setProfile(null)
  }

  const updateProfile = async (updates) => {
    if (!user) return
    const { data } = await supabase.from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id).select().single()
    if (data) setProfile(data)
    return data
  }

  const refreshProfile = () => user && fetchOrCreateProfile(user)

  return (
    <AuthCtx.Provider value={{
      user, profile, loading,
      signUp, signIn, signOut, updateProfile, refreshProfile
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
