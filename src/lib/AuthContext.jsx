import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthCtx = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchOrCreateProfile(u) {
    try {
      let { data } = await supabase
        .from('profiles').select('*').eq('id', u.id).single()

      if (!data) {
        const { data: created } = await supabase
          .from('profiles')
          .upsert({
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || 'Friend',
            onboarding_completed: false,
            payday_date: 25,
            emergency_reserve_target: 5000
          }, { onConflict: 'id' })
          .select('*').single()
        data = created
      }

      if (data) setProfile(data)
    } catch (e) {
      console.error('Profile error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Persist session across tab switches
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchOrCreateProfile(u)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            fetchOrCreateProfile(u)
          }
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const signUp = (email, pass, name, phone) =>
    supabase.auth.signUp({
      email, password: pass,
      options: { data: { full_name: name, phone_number: phone } }
    })

  const signIn = (email, pass) =>
    supabase.auth.signInWithPassword({ email, password: pass })

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const updateProfile = async (updates) => {
    if (!user) return null
    const { data } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || profile?.full_name || 'Friend',
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select('*').single()
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
