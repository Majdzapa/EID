import { useState } from 'react'
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
  subjectDn: string
  certificateInfo: CertificateInfo
}

interface LoginProps {
  onLogin: (result: LoginResult) => void
}

type Mode = 'demo' | 'real'

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<Mode>('demo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)

  const steps = [
    { label: 'Request challenge nonce', desc: 'Server generates a unique nonce' },
    { label: mode === 'demo' ? 'Simulate smart card signing' : 'Sign with eID card', desc: mode === 'demo' ? 'Backend signs nonce with test certificate' : 'Web eID extension talks to your smart card' },
    { label: 'Verify & establish session', desc: 'Server validates token, extracts identity' },
  ]

  const handleDemoLogin = async () => {
    setError(null)
    setLoading(true)
    setStep(0)
    try {
      setStep(1)
      // 1. Get demo challenge
      await api.getDemoChallenge()

      setStep(2)
      // 2. Backend simulates the smart card - signs nonce with test cert
      await new Promise(r => setTimeout(r, 600)) // small delay for UX

      setStep(3)
      // 3. Complete login
      const result = await api.demoLogin()

      if (result.status === 'AUTHENTICATED') {
        onLogin(result)
      } else {
        setError('Unexpected response from server')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Demo login failed')
    } finally {
      setLoading(false)
      setStep(0)
    }
  }

  const handleRealLogin = async () => {
    setError(null)
    setLoading(true)
    setStep(0)
    try {
      // Dynamically import web-eid library only for real mode
      const webEid = await import('@web-eid/web-eid-library')

      setStep(1)
      const { nonce } = await api.getChallenge()

      setStep(2)
      const authResponse = await webEid.authenticate(nonce)

      setStep(3)
      const loginResult = await api.login(authResponse)

      if (loginResult.status === 'AUTHENTICATED') {
        onLogin({ ...loginResult, certificateInfo: { subject: loginResult.user, issuer: '', validFrom: '', validUntil: '', serialNumber: '' } })
      }
    } catch (e: unknown) {
      const err = e as Record<string, unknown>
      const errCode = err?.code as string | undefined
      if (errCode === 'ERR_WEBEID_EXTENSION_UNAVAILABLE') {
        setError('Web eID browser extension is not installed. Please install it from web-eid.eu')
      } else if (errCode === 'ERR_WEBEID_USER_CANCELLED') {
        setError('Login was cancelled.')
      } else {
        setError(e instanceof Error ? e.message : 'Authentication failed')
      }
    } finally {
      setLoading(false)
      setStep(0)
    }
  }

  const getStepState = (idx: number) => {
    if (!loading) return 'pending'
    if (idx + 1 < step) return 'done'
    if (idx + 1 === step) return 'active'
    return 'pending'
  }

  return (
    <div className="main">
      <div className="hero">
        <h2>eID Authentication Demo</h2>
        <p>
          A full-stack Web eID integration with Spring Boot 3 + React.
          Choose demo mode to test without a physical smart card, or use your real eID.
        </p>
      </div>

      <div className="mode-switcher">
        <div
          className={`mode-card demo ${mode === 'demo' ? 'active' : ''}`}
          onClick={() => !loading && setMode('demo')}
          id="mode-demo"
        >
          <span className="mode-badge demo">No Hardware Required</span>
          <div className="mode-card-icon">🧪</div>
          <h3>Demo Mode</h3>
          <p>Simulates a smart card using a pre-generated self-signed certificate. No extension or card reader needed.</p>
        </div>

        <div
          className={`mode-card real ${mode === 'real' ? 'active' : ''}`}
          onClick={() => !loading && setMode('real')}
          id="mode-real"
        >
          <span className="mode-badge real">Real Hardware</span>
          <div className="mode-card-icon">💳</div>
          <h3>Real eID Card</h3>
          <p>Uses the Web eID browser extension and a physical eID smart card with PIN verification.</p>
        </div>
      </div>

      <div className="card">
        {mode === 'real' && (
          <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
            <span>ℹ️</span>
            <div>
              Requires: <strong>Web eID browser extension</strong> installed + eID card inserted.
              Install from <a href="https://web-eid.eu" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>web-eid.eu</a>
            </div>
          </div>
        )}

        {mode === 'demo' && (
          <div className="alert alert-warning" style={{ marginBottom: '1.25rem' }}>
            <span>⚠️</span>
            <div>
              Demo only — server signs with test certificate. In production, only the physical smart card can sign. The private key never leaves the card.
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <span>✕</span>
            <div>{error}</div>
          </div>
        )}

        {loading && (
          <div className="steps" style={{ marginBottom: '1.5rem' }}>
            {steps.map((s, i) => (
              <div className="step" key={i}>
                <div className={`step-icon ${getStepState(i)}`}>
                  {getStepState(i) === 'done' ? '✓' : getStepState(i) === 'active' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : i + 1}
                </div>
                <div className="step-content">
                  <div className="step-label">{s.label}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === 'demo' ? (
          <button
            id="btn-demo-login"
            className="btn btn-success btn-lg btn-full"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> Simulating...</> : '🧪 Demo Login (No Card Required)'}
          </button>
        ) : (
          <button
            id="btn-eid-login"
            className="btn btn-primary btn-lg btn-full"
            onClick={handleRealLogin}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> Authenticating...</> : '💳 Login with eID Card'}
          </button>
        )}
      </div>
    </div>
  )
}
