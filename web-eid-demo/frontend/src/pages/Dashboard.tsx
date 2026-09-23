import { useState } from 'react'
import { api } from '../services/api'

interface CertificateInfo {
  subject: string
  issuer: string
  validFrom: string
  validUntil: string
  serialNumber: string
}

interface DashboardProps {
  user: string
  subjectDn?: string
  certificateInfo?: CertificateInfo
  onLogout: () => void
}

type SignStatus = 'idle' | 'reading' | 'preparing' | 'signing' | 'finalizing' | 'done' | 'error'

const signSteps = [
  { key: 'reading', label: 'Reading document', desc: 'Converting file to bytes' },
  { key: 'preparing', label: 'Preparing hash', desc: 'Backend computes document digest' },
  { key: 'signing', label: 'Signing (simulated)', desc: 'Signing hash with test certificate' },
  { key: 'finalizing', label: 'Finalizing', desc: 'Attaching signature to document' },
]

export default function Dashboard({ user, subjectDn, certificateInfo, onLogout }: DashboardProps) {
  const [file, setFile] = useState<File | null>(null)
  const [signStatus, setSignStatus] = useState<SignStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleLogout = async () => {
    await api.logout()
    onLogout()
  }

  const handleFile = (f: File) => {
    setFile(f)
    setSignStatus('idle')
    setError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleSign = async () => {
    if (!file) return
    setError(null)

    try {
      setSignStatus('reading')
      const base64 = await fileToBase64(file)

      setSignStatus('preparing')
      const { documentHash, hashAlgorithm } = await api.prepareDocument(base64, file.name)

      setSignStatus('signing')
      await new Promise(r => setTimeout(r, 800)) // simulate card signing time

      setSignStatus('finalizing')
      await api.signDocument({
        unverifiedCertificate: '',
        signatureAlgorithm: hashAlgorithm || 'SHA-384',
        signature: btoa(documentHash) // demo: just echo hash as "signature"
      })

      setSignStatus('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signing failed')
      setSignStatus('error')
    }
  }

  const getStepState = (key: string) => {
    const order = ['reading', 'preparing', 'signing', 'finalizing']
    const currentIdx = order.indexOf(signStatus)
    const stepIdx = order.indexOf(key)
    if (signStatus === 'done') return 'done'
    if (currentIdx === -1) return 'pending'
    if (stepIdx < currentIdx) return 'done'
    if (stepIdx === currentIdx) return 'active'
    return 'pending'
  }

  const initials = user.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <>
      <div className="main">
        <div className="alert alert-success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="status-dot green" />
            <strong>Authenticated</strong> — Session active via eID demo certificate
          </div>
        </div>

        <div className="dashboard-grid">
          {/* User card */}
          <div className="user-card">
            <div className="user-card-header">
              <div className="user-avatar">{initials}</div>
              <div>
                <div className="user-info-name">{user}</div>
                <div className="user-info-sub">eID Certificate Holder</div>
              </div>
            </div>
            <div className="user-card-body">
              {certificateInfo && (
                <>
                  <div className="card-title" style={{ marginBottom: '0.5rem' }}>Certificate Details</div>
                  <div className="cert-row">
                    <span className="cert-label">Subject DN</span>
                    <span className="cert-value">{certificateInfo.subject || subjectDn || '—'}</span>
                  </div>
                  {certificateInfo.issuer && (
                    <div className="cert-row">
                      <span className="cert-label">Issuer</span>
                      <span className="cert-value">{certificateInfo.issuer}</span>
                    </div>
                  )}
                  {certificateInfo.serialNumber && (
                    <div className="cert-row">
                      <span className="cert-label">Serial Number</span>
                      <span className="cert-value">{certificateInfo.serialNumber}</span>
                    </div>
                  )}
                  {certificateInfo.validUntil && (
                    <div className="cert-row">
                      <span className="cert-label">Valid Until</span>
                      <span className="cert-value">{new Date(certificateInfo.validUntil).toLocaleDateString()}</span>
                    </div>
                  )}
                </>
              )}
              <div style={{ marginTop: '1rem' }}>
                <button id="btn-logout" className="btn btn-ghost btn-full" onClick={handleLogout}>
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Signing card */}
          <div className="sign-card">
            <div className="sign-card-header">
              <h3>Document Signing</h3>
              <p>Upload a document to sign it with your eID certificate</p>
            </div>
            <div className="sign-card-body">
              <div
                className="upload-zone"
                style={{ borderColor: dragOver ? 'var(--accent-blue)' : undefined, marginBottom: '1.5rem' }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input type="file" id="file-input" onChange={handleFileChange} />
                <div className="upload-zone-icon">📄</div>
                {file
                  ? <><p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{file.name}</p><p className="hint">{(file.size / 1024).toFixed(1)} KB — click or drag to replace</p></>
                  : <><p>Drop a file here or click to browse</p><p className="hint">PDF, DOCX, XML, or any format</p></>
                }
              </div>

              {(signStatus !== 'idle' && signStatus !== 'done' && signStatus !== 'error') && (
                <div className="steps">
                  {signSteps.map((s) => (
                    <div className="step" key={s.key}>
                      <div className={`step-icon ${getStepState(s.key)}`}>
                        {getStepState(s.key) === 'done' ? '✓' : getStepState(s.key) === 'active' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '·'}
                      </div>
                      <div className="step-content">
                        <div className="step-label">{s.label}</div>
                        <div className="step-desc">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {signStatus === 'done' && (
                <div className="alert alert-success">
                  <span>✓</span>
                  <div>
                    <strong>Document signed successfully!</strong> In production, the server would return an ASiC-E (.asice) container.
                  </div>
                </div>
              )}

              {error && (
                <div className="alert alert-error">
                  <span>✕</span>
                  <div>{error}</div>
                </div>
              )}

              {file && signStatus !== 'done' && (
                <button
                  id="btn-sign"
                  className="btn btn-primary btn-lg btn-full"
                  onClick={handleSign}
                  disabled={signStatus !== 'idle' && signStatus !== 'error'}
                >
                  {signStatus !== 'idle' && signStatus !== 'error'
                    ? <><span className="spinner" /> Signing...</>
                    : '🔏 Sign Document'}
                </button>
              )}
              {!file && (
                <button className="btn btn-ghost btn-lg btn-full" disabled>
                  Select a document first
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
