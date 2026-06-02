import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthCtx = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchOrCreateProfile(u) {
    try {
      // Try to get existing profile
      let { data, error } = await supabase
        .from('profiles').select('*').eq('id', u.id).single()

      // If not found, create it
      if (error?.code === 'PGRST116' || !data) {
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || 'Friend',
            onboarding_completed: false
          }, { onConflict: 'id' })
          .select('*')
          .single()

        if (createError) console.error('Create profile error:', createError)
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
    const timer = setTimeout(() => setLoading(false), 6000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetchOrCreateProfile(u).finally(() => {
          clearTimeout(timer)
          setLoading(false)
        })
      } else {
        clearTimeout(timer)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          setLoading(true)
          fetchOrCreateProfile(u).finally(() => setLoading(false))
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )
    return () => { subscription.unsubscribe(); clearTimeout(timer) }
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

  // THIS IS THE FIX — upsert instead of update so it always works
  const updateProfile = async (updates) => {
    if (!user) return null
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 'Friend',
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) {
      console.error('updateProfile error:', error)
      return null
    }
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
