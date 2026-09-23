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

    prepareDocument: async (fileContentBase64: string, fileName: string) => {
        const response = await api.fetchWithAuth('/api/documents/prepare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileContentBase64, fileName })
        })
        if (!response.ok) throw new Error('Failed to prepare document')
        return response.json()
    },

    signDocument: async (signatureData: unknown) => {
        const response = await api.fetchWithAuth('/api/documents/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signatureData)
        })
        if (!response.ok) throw new Error('Failed to sign document')
        return response.json()
    }
}
