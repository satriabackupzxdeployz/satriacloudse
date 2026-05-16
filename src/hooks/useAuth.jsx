import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AuthContext = createContext(null)

function pfpKey(email) {
  return `sc_pfp_${email.replace(/[^a-zA-Z0-9]/g, '_')}`
}

function sessionKey(email) {
  return `sc_tok_${email.replace(/[^a-zA-Z0-9]/g, '_')}`
}

async function fetchSessionToken(email, sub) {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, sub }),
    })
    const data = await res.json()
    if (data.success && data.token) return data.token
  } catch {}
  return null
}

function silentPing() {
  try { fetch('/api/ping', { method: 'POST' }).catch(() => {}) } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const pingRef = useRef(false)

  useEffect(() => {
    const raw = localStorage.getItem('sc_user')
    if (raw) {
      try {
        const base = JSON.parse(raw)
        const pfpRaw = localStorage.getItem(pfpKey(base.email))
        const pfp = pfpRaw ? JSON.parse(pfpRaw) : {}
        setUser({ ...base, customPhotoFileId: pfp.fileId || null, customPhotoMsgId: pfp.msgId || null })
        silentPing()
      } catch { localStorage.removeItem('sc_user') }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible' && !pingRef.current) {
        pingRef.current = true
        silentPing()
        setTimeout(() => { pingRef.current = false }, 5000)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const getSessionToken = useCallback((email) => {
    const raw = localStorage.getItem(sessionKey(email))
    if (!raw) return null
    try { return JSON.parse(raw).token } catch { return null }
  }, [])

  const login = useCallback(async (userData) => {
    const base = {
      name: userData.name,
      email: userData.email,
      picture: userData.picture || '',
      sub: userData.sub || '',
    }
    localStorage.setItem('sc_user', JSON.stringify(base))

    silentPing()

    let token = getSessionToken(userData.email)
    if (!token) {
      token = await fetchSessionToken(userData.email, userData.sub || '')
      if (token) {
        localStorage.setItem(sessionKey(userData.email), JSON.stringify({ token }))
      }
    }

    const pfpRaw = localStorage.getItem(pfpKey(userData.email))
    const pfp = pfpRaw ? JSON.parse(pfpRaw) : {}

    const u = { ...base, customPhotoFileId: pfp.fileId || null, customPhotoMsgId: pfp.msgId || null, sessionToken: token }
    setUser(u)
    return u
  }, [getSessionToken])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('sc_user')
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect()
  }, [])

  const updateCustomPhoto = useCallback(async (file, currentUser) => {
    const form = new FormData()
    form.append('photo', file, file.name)
    form.append('email', currentUser?.email || 'unknown')
    if (currentUser?.customPhotoMsgId) {
      form.append('oldMessageId', String(currentUser.customPhotoMsgId))
    }

    const res = await fetch('/api/profile', { method: 'POST', body: form })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Upload foto gagal')

    const pfp = { fileId: data.fileId, msgId: data.messageId }
    localStorage.setItem(pfpKey(currentUser.email), JSON.stringify(pfp))

    const updated = { ...currentUser, customPhotoFileId: data.fileId, customPhotoMsgId: data.messageId }
    setUser(updated)
    localStorage.setItem('sc_user', JSON.stringify({
      name: currentUser.name,
      email: currentUser.email,
      picture: currentUser.picture,
      sub: currentUser.sub,
    }))
    return updated
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateCustomPhoto, getSessionToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
