import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface CertificateInfo {
  subject: string
  issuer: string
  validFrom: string
  validUntil: string
  serialNumber: string
}

interface LoginResult {
  status: string
  user: string
  subjectDn?: string
  certificateInfo?: CertificateInfo
  loginMethod?: string
}

interface LoginProps {
  onLogin: (result: LoginResult) => void
}

type Mode = 'password' | 'eid' | 'demo'

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<Mode>('password')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [demoModeEnabled, setDemoModeEnabled] = useState(false)
  const [profile, setProfile] = useState<string>('...')

  // Password form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    api.getInfo().then(info => {
      setDemoModeEnabled(info.demoModeEnabled)
      setProfile(info.profile)
      // In prod, default to eid mode since demo is unavailable
      if (!info.demoModeEnabled) setMode('eid')
    })
  }, [])

  const eidSteps = [
    { label: 'Request challenge nonce', desc: 'Server generates a unique cryptographic nonce' },
    { label: mode === 'demo' ? 'Simulate card signing' : 'Sign with eID card', desc: mode === 'demo' ? 'Backend signs nonce with test certificate' : 'Web eID extension communicates with your smart card' },
    { label: 'Verify & establish session', desc: 'Server validates token, extracts identity from certificate' },
  ]

  // ─── Password Login ──────────────────────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await api.passwordLogin(username, password)
      if (result.status === 'AUTHENTICATED') {
        if (result.token) api.setToken(result.token)
        onLogin({
          ...result,
          certificateInfo: {
            subject: result.user,
            issuer: 'Local User Store',
            validFrom: '',
            validUntil: '',
            serialNumber: '',
          }
        })
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // ─── Demo eID Login ──────────────────────────────────────────────────────────
  const handleDemoLogin = async () => {
    setError(null)
    setLoading(true)
    setStep(0)
    try {
      setStep(1)
      await api.getDemoChallenge()
      setStep(2)
      await new Promise(r => setTimeout(r, 600))
      setStep(3)
      const result = await api.demoLogin()
      if (result.status === 'AUTHENTICATED') {
        if (result.token) api.setToken(result.token)
        onLogin(result)
      } else setError('Unexpected response from server')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Demo login failed')
    } finally {
      setLoading(false)
      setStep(0)
    }
  }

  // ─── Real eID Login ──────────────────────────────────────────────────────────
  const handleRealLogin = async () => {
    setError(null)
    setLoading(true)
    setStep(0)
    try {
      const webEid = await import('@web-eid/web-eid-library')
      setStep(1)
      const { nonce } = await api.getChallenge()
      setStep(2)
      const authResponse = await webEid.authenticate(nonce)
      setStep(3)
      const loginResult = await api.login(authResponse)
      if (loginResult.status === 'AUTHENTICATED') {
        if (loginResult.token) api.setToken(loginResult.token)
        onLogin({
          ...loginResult,
          certificateInfo: loginResult.certificateInfo ?? {
            subject: loginResult.user, issuer: '', validFrom: '', validUntil: '', serialNumber: ''
          }
        })
      }
    } catch (e: unknown) {
      const err = e as Record<string, unknown>
      const code = err?.code as string | undefined
      if (code === 'ERR_WEBEID_EXTENSION_UNAVAILABLE')
        setError('Web eID browser extension is not installed. Please install it from web-eid.eu')
      else if (code === 'ERR_WEBEID_USER_CANCELLED')
        setError('Login was cancelled.')
      else
        setError(e instanceof Error ? e.message : 'Authentication failed')
    } finally {
      setLoading(false)
      setStep(0)
    }
  }

  const getStepState = (idx: number) => {
    if (!loading || mode === 'password') return 'pending'
    if (idx + 1 < step) return 'done'
    if (idx + 1 === step) return 'active'
    return 'pending'
  }

  const profileBadgeColor = profile === 'prod' ? '#ef4444' : '#f59e0b'

  return (
    <div className="main">
      <div className="hero">
        <h2>eID Authentication Demo</h2>
        <p>
          Spring Boot 3 + React · <strong>Web eID</strong> Smart Card Integration
        </p>
        {/* Profile badge */}
        <span style={{
          display: 'inline-block', marginTop: '0.5rem',
          padding: '0.2rem 0.75rem', borderRadius: '999px',
          fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em',
          background: profileBadgeColor + '22', color: profileBadgeColor,
          border: `1px solid ${profileBadgeColor}44`
        }}>
          {profile === 'prod' ? '🔒 PRODUCTION' : '🧪 DEMO'} PROFILE
        </span>
      </div>

      {/* ─── Mode selector ─────────────────────────────────────────── */}
      <div className="mode-switcher" style={{ gridTemplateColumns: demoModeEnabled ? 'repeat(3,1fr)' : 'repeat(2,1fr)' }}>

        <div className={`mode-card ${mode === 'password' ? 'active' : ''}`}
          onClick={() => !loading && setMode('password')} id="mode-password">
          <span className="mode-badge demo">Always Available</span>
          <div className="mode-card-icon">🔑</div>
          <h3>Username & Password</h3>
          <p>Login with local credentials. Demo credentials: <code>admin / admin</code></p>
        </div>

        <div className={`mode-card real ${mode === 'eid' ? 'active' : ''}`}
          onClick={() => !loading && setMode('eid')} id="mode-eid">
          <span className="mode-badge real">Real Hardware</span>
          <div className="mode-card-icon">💳</div>
          <h3>eID Smart Card</h3>
          <p>Authenticate with a physical eID card via the Web eID browser extension.</p>
        </div>

        {demoModeEnabled && (
          <div className={`mode-card demo ${mode === 'demo' ? 'active' : ''}`}
            onClick={() => !loading && setMode('demo')} id="mode-demo">
            <span className="mode-badge demo">Demo Only</span>
            <div className="mode-card-icon">🧪</div>
            <h3>Simulate eID</h3>
            <p>Simulates the smart-card flow using a pre-generated test certificate. No hardware needed.</p>
          </div>
        )}
      </div>

      {/* ─── Login card ────────────────────────────────────────────── */}
      <div className="card">

        {/* Info banners */}
        {mode === 'eid' && (
          <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
            <span>ℹ️</span>
            <div>Requires: <strong>Web eID browser extension</strong> + eID card inserted.
              Install from <a href="https://web-eid.eu" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>web-eid.eu</a>
            </div>
          </div>
        )}
        {mode === 'demo' && (
          <div className="alert alert-warning" style={{ marginBottom: '1.25rem' }}>
            <span>⚠️</span>
            <div>Demo mode — server signs with test certificate. Not available in production profile.</div>
          </div>
        )}
        {mode === 'password' && (
          <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
            <span>ℹ️</span>
            <div>
              {profile === 'demo'
                ? <>Demo credentials: <code>admin</code> / <code>admin</code></>
                : 'Enter your credentials to sign in.'}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
            <span>✕</span>
            <div>{error}</div>
          </div>
        )}

        {/* ─── Password form ─── */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="input-username" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Username
              </label>
              <input
                id="input-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                disabled={loading}
                style={{
                  width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--text-primary)', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label htmlFor="input-password" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input
                id="input-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--text-primary)', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              id="btn-password-login"
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading || !username || !password}
            >
              {loading ? <><span className="spinner" /> Signing in...</> : '🔑 Sign In'}
            </button>
          </form>
        )}

        {/* ─── eID steps (shown during loading for eid/demo) ─── */}
        {(mode === 'eid' || mode === 'demo') && loading && (
          <div className="steps" style={{ marginBottom: '1.5rem' }}>
            {eidSteps.map((s, i) => (
              <div className="step" key={i}>
                <div className={`step-icon ${getStepState(i)}`}>
                  {getStepState(i) === 'done' ? '✓'
                    : getStepState(i) === 'active' ? <span className="spinner" style={{ width: 14, height: 14 }} />
                    : i + 1}
                </div>
                <div className="step-content">
                  <div className="step-label">{s.label}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── eID button ─── */}
        {mode === 'eid' && (
          <button id="btn-eid-login" className="btn btn-primary btn-lg btn-full"
            onClick={handleRealLogin} disabled={loading}>
            {loading ? <><span className="spinner" /> Authenticating...</> : '💳 Login with eID Card'}
          </button>
        )}

        {/* ─── Demo eID button ─── */}
        {mode === 'demo' && (
          <button id="btn-demo-login" className="btn btn-success btn-lg btn-full"
            onClick={handleDemoLogin} disabled={loading}>
            {loading ? <><span className="spinner" /> Simulating...</> : '🧪 Demo Login (No Card Required)'}
          </button>
        )}
      </div>
    </div>
  )
}
