import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexemers_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user)
        localStorage.setItem('nexemers_user', JSON.stringify(data.user))
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setUser(data.user)
    localStorage.setItem('nexemers_user', JSON.stringify(data.user))
    return data.user
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setUser(null)
    localStorage.removeItem('nexemers_user')
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
