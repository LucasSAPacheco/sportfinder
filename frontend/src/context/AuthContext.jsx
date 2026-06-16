import { createContext, useContext, useState } from 'react'

const AuthCtx = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sf_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const login = (token, userData) => {
    localStorage.setItem('sf_token', token)
    localStorage.setItem('sf_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('sf_token')
    localStorage.removeItem('sf_user')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, isAuth: !!user }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
