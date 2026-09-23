import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { api } from './services/api'

interface AuthUser {
  name: string
  subjectDn?: string
  certificateInfo?: {
    subject: string
    issuer: string
    validFrom: string
    validUntil: string
    serialNumber: string
  }
}

function App() {
  const [auth, setAuth] = useState<AuthUser | null | undefined>(undefined) // undefined = loading

  useEffect(() => {
    api.checkAuth()
      .then(r => {
        if (r.ok) return r.json()
        throw new Error('not authenticated')
      })
      .then(data => {
        const name = typeof data === 'string' ? data : (data?.username || data?.name || 'Authenticated User')
        setAuth({ name })
      })
      .catch(() => setAuth(null))
  }, [])

  if (auth === undefined) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 1rem' }} />
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">🔐</div>
          <h1>Web eID Demo</h1>
        </div>
        <span className="header-badge">Development</span>
      </header>

      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              auth
                ? <Navigate to="/dashboard" />
                : <Login onLogin={(result) => setAuth({ name: result.user, subjectDn: result.subjectDn, certificateInfo: result.certificateInfo })} />
            }
          />
          <Route
            path="/dashboard"
            element={
              auth
                ? <Dashboard user={auth.name} subjectDn={auth.subjectDn} certificateInfo={auth.certificateInfo} onLogout={() => setAuth(null)} />
                : <Navigate to="/login" />
            }
          />
          <Route path="*" element={<Navigate to={auth ? '/dashboard' : '/login'} />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App
