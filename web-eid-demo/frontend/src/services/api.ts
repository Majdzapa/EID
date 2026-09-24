const TOKEN_KEY = 'webeid_jwt'

export const api = {
    // ─── Token Management ──────────────────────────────────────────────────────
    setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
    getToken: () => localStorage.getItem(TOKEN_KEY),
    removeToken: () => localStorage.removeItem(TOKEN_KEY),

    // Helper for authenticated requests
    fetchWithAuth: async (url: string, options: RequestInit = {}) => {
        const token = api.getToken()
        const headers = new Headers(options.headers || {})
        if (token) {
            headers.set('Authorization', `Bearer ${token}`)
        }
        
        return fetch(url, {
            ...options,
            headers
        })
    },

    // ─── App info (profile) ────────────────────────────────────────────────────
    getInfo: async (): Promise<{ profile: string; demoModeEnabled: boolean }> => {
        const res = await fetch('/api/info')
        if (!res.ok) return { profile: 'demo', demoModeEnabled: true } // safe default
        return res.json()
    },

    checkAuth: () => api.fetchWithAuth('/api/auth/me'),

    // ─── Username + Password login ─────────────────────────────────────────────
    passwordLogin: async (username: string, password: string) => {
        const res = await fetch('/api/auth/password/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Login failed' }))
            throw new Error(err.error || 'Login failed')
        }
        return res.json()
    },

    // ─── Real Web eID flow ─────────────────────────────────────────────────────
    getChallenge: async () => {
        const response = await fetch('/api/auth/challenge')
        if (!response.ok) throw new Error('Failed to get challenge nonce')
        return response.json()
    },

    login: async (authToken: unknown) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(JSON.stringify(authToken))
        })
        if (!response.ok) throw new Error(await response.text())
        return response.json()
    },

    // ─── Demo / Simulation flow (no smart card required) ──────────────────────
    getDemoChallenge: async () => {
        const response = await fetch('/api/auth/demo/challenge')
        if (!response.ok) throw new Error('Failed to get demo challenge nonce')
        return response.json()
    },

    demoLogin: async () => {
        const response = await fetch('/api/auth/demo/login', {
            method: 'POST'
        })
        if (!response.ok) throw new Error(await response.text())
        return response.json()
    },

    // ─── Common ────────────────────────────────────────────────────────────────
    logout: () => {
        api.removeToken()
        return fetch('/api/auth/logout', { method: 'POST' })
    },

    // ─── Document Management ───────────────────────────────────────────────────

    uploadDocument: async (file: File) => {
        const formData = new FormData()
        formData.append('file', file)
        
        const token = api.getToken()
        const headers = new Headers()
        if (token) headers.set('Authorization', `Bearer ${token}`)

        const response = await fetch('/api/documents/upload', {
            method: 'POST',
            headers, // Do NOT set Content-Type, browser will set it with boundary
            body: formData
        })
        if (!response.ok) throw new Error(await response.text())
        return response.json()
    },

    listDocuments: async () => {
        const response = await api.fetchWithAuth('/api/documents')
        if (!response.ok) throw new Error('Failed to list documents')
        return response.json()
    },

    // ─── Real Web eID Signing ──────────────────────────────────────────────────

    prepareDocumentSign: async (documentId: number) => {
        const response = await api.fetchWithAuth(`/api/documents/${documentId}/prepare-sign`)
        if (!response.ok) throw new Error('Failed to prepare document')
        return response.json()
    },

    finalizeDocumentSign: async (documentId: number, signature: string, algorithm: string, certificate: string) => {
        const response = await api.fetchWithAuth(`/api/documents/${documentId}/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signature, algorithm, certificate })
        })
        if (!response.ok) throw new Error('Failed to finalize document sign')
        return response.json()
    },

    signHash: async (hashToSign: string, signature: string, algorithm: string, certificate: string) => {
        const response = await api.fetchWithAuth('/api/sign/hash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hashToSign, signature, algorithm, certificate })
        })
        if (!response.ok) throw new Error('Failed to sign hash')
        return response.json()
    },

    listSignatures: async () => {
        const response = await api.fetchWithAuth('/api/signatures')
        if (!response.ok) throw new Error('Failed to list signatures')
        return response.json()
    }
}
