import { useState, useEffect } from 'react'
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

type SignStatus = 'idle' | 'reading' | 'uploading' | 'preparing' | 'signing' | 'finalizing' | 'done' | 'error'

const signSteps = [
  { key: 'uploading', label: 'Uploading document', desc: 'Sending file to server' },
  { key: 'preparing', label: 'Preparing hash', desc: 'Backend computes document digest' },
  { key: 'signing', label: 'Smart Card Signing', desc: 'Signing with your eID certificate' },
  { key: 'finalizing', label: 'Finalizing', desc: 'Attaching signature to document' },
]

export default function Dashboard({ user, subjectDn, certificateInfo, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'document' | 'hash' | 'history'>('document')
  
  // Document signing state
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  
  // Hash signing state
  const [rawHash, setRawHash] = useState('')
  
  // Shared state
  const [signStatus, setSignStatus] = useState<SignStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])

  const handleLogout = async () => {
    await api.logout()
    onLogout()
  }

  const loadHistory = async () => {
    try {
      const data = await api.listSignatures()
      setHistory(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab])

  // ─── DOCUMENT SIGNING ────────────────────────────────────────────────────────

  const handleFile = (f: File) => {
    setFile(f)
    setSignStatus('idle')
    setError(null)
  }

  const handleSignDocument = async () => {
    if (!file) return
    setError(null)

    try {
      setSignStatus('uploading')
      const docInfo = await api.uploadDocument(file)

      setSignStatus('preparing')
      const { documentId, hashToSign, hashAlgorithm } = await api.prepareDocumentSign(docInfo.id)

      setSignStatus('signing')
      const webEid = await import('@web-eid/web-eid-library')
      
      // 1. Get the signing certificate from the card
      const certOptions = { type: 'SIGN' } // Filter for signing certs
      // @ts-ignore
      const certResponse = await webEid.getSigningCertificate(certOptions)

      // 2. Sign the hash using the obtained certificate
      const signResponse = await webEid.sign(certResponse.certificate, hashToSign, hashAlgorithm)

      setSignStatus('finalizing')
      const algStr = `${signResponse.signatureAlgorithm.hashFunction}with${signResponse.signatureAlgorithm.cryptoAlgorithm}`
      await api.finalizeDocumentSign(
        documentId, 
        signResponse.signature, 
        algStr, 
        certResponse.certificate
      )

      setSignStatus('done')
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Signing failed')
      setSignStatus('error')
    }
  }

  // ─── HASH SIGNING ────────────────────────────────────────────────────────────

  const handleSignHash = async () => {
    if (!rawHash) return
    setError(null)
    setSignStatus('idle')

    try {
      setSignStatus('signing')
      const webEid = await import('@web-eid/web-eid-library')
      
      const certOptions = { type: 'SIGN' }
      // @ts-ignore
      const certResponse = await webEid.getSigningCertificate(certOptions)

      const hashAlgorithm = 'SHA-384'
      const signResponse = await webEid.sign(certResponse.certificate, rawHash, hashAlgorithm)

      setSignStatus('finalizing')
      const algStr = `${signResponse.signatureAlgorithm.hashFunction}with${signResponse.signatureAlgorithm.cryptoAlgorithm}`
      await api.signHash(
        rawHash, 
        signResponse.signature, 
        algStr, 
        certResponse.certificate
      )

      setSignStatus('done')
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Signing failed')
      setSignStatus('error')
    }
  }

  // ─── UI HELPERS ──────────────────────────────────────────────────────────────

  const getStepState = (key: string) => {
    const order = ['uploading', 'preparing', 'signing', 'finalizing']
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
    <div className="main">
      <div className="alert alert-success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="status-dot green" />
          <strong>Authenticated</strong> — Secure session via eID certificate
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <button 
                className={`btn ${activeTab === 'document' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => { setActiveTab('document'); setSignStatus('idle'); setError(null) }}
              >
                Document Signing
              </button>
              <button 
                className={`btn ${activeTab === 'hash' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => { setActiveTab('hash'); setSignStatus('idle'); setError(null) }}
              >
                Raw Hash Signing
              </button>
              <button 
                className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => { setActiveTab('history') }}
              >
                Signature History
              </button>
            </div>

            {certificateInfo && (
              <div style={{ fontSize: '0.85rem' }}>
                <div className="card-title" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Certificate Info</div>
                <div className="cert-row">
                  <span className="cert-label">Subject DN</span>
                  <span className="cert-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{certificateInfo.subject || subjectDn || '—'}</span>
                </div>
                {certificateInfo.serialNumber && (
                  <div className="cert-row">
                    <span className="cert-label">Serial</span>
                    <span className="cert-value">{certificateInfo.serialNumber}</span>
                  </div>
                )}
              </div>
            )}
            
            <div style={{ marginTop: '1.5rem' }}>
              <button id="btn-logout" className="btn btn-ghost btn-full" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="sign-card">
          
          {/* Document Tab */}
          {activeTab === 'document' && (
            <>
              <div className="sign-card-header">
                <h3>Document Signing</h3>
                <p>Upload a document to sign it securely with your eID smart card</p>
              </div>
              <div className="sign-card-body">
                <div
                  className="upload-zone"
                  style={{ borderColor: dragOver ? 'var(--accent-blue)' : undefined, marginBottom: '1.5rem' }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragOver(false)
                    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
                  }}
                >
                  <input type="file" id="file-input" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
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
                      <strong>Document signed successfully!</strong> The signature has been stored in the database.
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
                    className="btn btn-primary btn-lg btn-full"
                    onClick={handleSignDocument}
                    disabled={signStatus !== 'idle' && signStatus !== 'error'}
                  >
                    {signStatus !== 'idle' && signStatus !== 'error'
                      ? <><span className="spinner" /> Signing...</>
                      : '🔏 Sign Document with Smart Card'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Hash Tab */}
          {activeTab === 'hash' && (
            <>
              <div className="sign-card-header">
                <h3>Raw Hash Signing</h3>
                <p>Sign an arbitrary Base64-encoded hash directly using your smart card</p>
              </div>
              <div className="sign-card-body">
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Base64 Hash (SHA-384)</label>
                  <textarea 
                    value={rawHash}
                    onChange={(e) => { setRawHash(e.target.value); setSignStatus('idle'); setError(null) }}
                    className="form-control" 
                    placeholder="Enter Base64-encoded hash string here..."
                    style={{ width: '100%', height: '100px', resize: 'vertical' }}
                  />
                </div>

                {signStatus === 'signing' && (
                  <div className="alert alert-info">
                    <span className="spinner" style={{ borderColor: 'var(--accent-blue)', borderRightColor: 'transparent' }} />
                    <div style={{ marginLeft: '10px' }}>
                      <strong>Waiting for smart card...</strong> Follow the instructions in the Web eID prompt.
                    </div>
                  </div>
                )}

                {signStatus === 'finalizing' && (
                  <div className="alert alert-info">
                    <span className="spinner" style={{ borderColor: 'var(--accent-blue)', borderRightColor: 'transparent' }} />
                    <div style={{ marginLeft: '10px' }}>
                      <strong>Saving signature...</strong>
                    </div>
                  </div>
                )}

                {signStatus === 'done' && (
                  <div className="alert alert-success">
                    <span>✓</span>
                    <div>
                      <strong>Hash signed successfully!</strong> The signature record has been stored.
                    </div>
                  </div>
                )}

                {error && (
                  <div className="alert alert-error">
                    <span>✕</span>
                    <div>{error}</div>
                  </div>
                )}

                {signStatus !== 'done' && (
                  <button
                    className="btn btn-primary btn-lg btn-full"
                    onClick={handleSignHash}
                    disabled={!rawHash || (signStatus !== 'idle' && signStatus !== 'error')}
                  >
                    {signStatus !== 'idle' && signStatus !== 'error'
                      ? <><span className="spinner" /> Processing...</>
                      : '🔏 Sign Hash with Smart Card'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <>
              <div className="sign-card-header">
                <h3>Your Signatures</h3>
                <p>History of all documents and hashes you have signed</p>
              </div>
              <div className="sign-card-body">
                {history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No signatures found.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem 0' }}>Type</th>
                        <th>Target</th>
                        <th>Algorithm</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((sig, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.75rem 0' }}>
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                              {sig.type}
                            </span>
                          </td>
                          <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sig.documentName}
                          </td>
                          <td>{sig.algorithm}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {new Date(sig.signedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
