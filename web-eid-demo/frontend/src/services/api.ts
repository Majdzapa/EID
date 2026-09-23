export const api = {
    // ─── App info (profile) ────────────────────────────────────────────────────
    getInfo: async (): Promise<{ profile: string; demoModeEnabled: boolean }> => {
        const res = await fetch('/api/info', { credentials: 'include' })
        if (!res.ok) return { profile: 'demo', demoModeEnabled: true } // safe default
        return res.json()
    },

    checkAuth: () => fetch('/api/auth/me', { credentials: 'include' }),

    // ─── Username + Password login ─────────────────────────────────────────────
    passwordLogin: async (username: string, password: string) => {
        const res = await fetch('/api/auth/password/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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
        const response = await fetch('/api/auth/challenge', { credentials: 'include' })
        if (!response.ok) throw new Error('Failed to get challenge nonce')
        return response.json()
    },

    login: async (authToken: unknown) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(JSON.stringify(authToken))
        })
        if (!response.ok) throw new Error(await response.text())
        return response.json()
    },

    // ─── Demo / Simulation flow (no smart card required) ──────────────────────
    getDemoChallenge: async () => {
        const response = await fetch('/api/auth/demo/challenge', { credentials: 'include' })
        if (!response.ok) throw new Error('Failed to get demo challenge nonce')
        return response.json()
    },

    demoLogin: async () => {
        const response = await fetch('/api/auth/demo/login', {
            method: 'POST',
            credentials: 'include',
        })
        if (!response.ok) throw new Error(await response.text())
        return response.json()
    },

    // ─── Common ────────────────────────────────────────────────────────────────
    logout: () => fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }),

    prepareDocument: async (fileContentBase64: string, fileName: string) => {
        const response = await fetch('/api/documents/prepare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fileContentBase64, fileName })
        })
        if (!response.ok) throw new Error('Failed to prepare document')
        return response.json()
    },

    signDocument: async (signatureData: unknown) => {
        const response = await fetch('/api/documents/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(signatureData)
        })
        if (!response.ok) throw new Error('Failed to sign document')
        return response.json()
    }
}
