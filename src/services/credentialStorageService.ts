const STORAGE_KEY = 'newsGlide.savedLogin'
const DECLINED_KEY = 'newsGlide.savedLoginDeclined'
const STORAGE_VERSION = 1

type StoredCredentials = {
  email: string
  password: string
  updatedAt: number
  version: number
}

type DeclinedMap = Record<string, number>

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch (error) {
    console.warn('LocalStorage unavailable for remembering login info:', error)
    return null
  }
}

const base64Encode = (value: string) => {
  if (typeof window === 'undefined') {
    return value
  }

  try {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(value)
    let binary = ''
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    return window.btoa(binary)
  } catch (error) {
    console.warn('Failed to encode remembered login value:', error)
    return value
  }
}

const base64Decode = (value: string) => {
  if (typeof window === 'undefined') {
    return value
  }

  try {
    const binary = window.atob(value)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const decoder = new TextDecoder()
    return decoder.decode(bytes)
  } catch (error) {
    console.warn('Failed to decode remembered login value:', error)
    return value
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const readJson = <T,>(storage: Storage | null, key: string): T | null => {
  if (!storage) {
    return null
  }

  try {
    const rawValue = storage.getItem(key)
    if (!rawValue) {
      return null
    }
    return JSON.parse(rawValue) as T
  } catch (error) {
    console.warn(`Failed to read "${key}" from storage:`, error)
    return null
  }
}

const writeJson = (storage: Storage | null, key: string, value: unknown) => {
  if (!storage) {
    return
  }

  try {
    storage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Failed to write "${key}" to storage:`, error)
  }
}

const removeKey = (storage: Storage | null, key: string) => {
  if (!storage) {
    return
  }

  try {
    storage.removeItem(key)
  } catch (error) {
    console.warn(`Failed to remove "${key}" from storage:`, error)
  }
}

const getDeclinedMap = (storage: Storage | null): DeclinedMap => {
  return readJson<DeclinedMap>(storage, DECLINED_KEY) ?? {}
}

const writeDeclinedMap = (storage: Storage | null, map: DeclinedMap) => {
  if (!storage) {
    return
  }

  if (Object.keys(map).length === 0) {
    removeKey(storage, DECLINED_KEY)
    return
  }

  writeJson(storage, DECLINED_KEY, map)
}

const removeDeclinedForEmail = (email: string) => {
  const storage = getStorage()
  if (!storage) {
    return
  }

  const map = getDeclinedMap(storage)
  const normalized = normalizeEmail(email)

  if (!map[normalized]) {
    return
  }

  delete map[normalized]
  writeDeclinedMap(storage, map)
}

const getSavedCredentials = (): { email: string; password: string } | null => {
  const storage = getStorage()
  const record = readJson<StoredCredentials>(storage, STORAGE_KEY)

  if (!record || !record.email || !record.password) {
    return null
  }

  if (record.version !== STORAGE_VERSION) {
    removeKey(storage, STORAGE_KEY)
    return null
  }

  return {
    email: record.email,
    password: base64Decode(record.password),
  }
}

const hasSavedCredentials = () => {
  return getSavedCredentials() !== null
}

const saveCredentials = (email: string, password: string) => {
  const storage = getStorage()
  if (!storage || !email || !password) {
    return
  }

  const payload: StoredCredentials = {
    email,
    password: base64Encode(password),
    updatedAt: Date.now(),
    version: STORAGE_VERSION,
  }

  writeJson(storage, STORAGE_KEY, payload)
  removeDeclinedForEmail(email)
}

const clearSavedCredentials = () => {
  const storage = getStorage()
  removeKey(storage, STORAGE_KEY)
}

const markDeclined = (email: string) => {
  const storage = getStorage()
  if (!storage || !email) {
    return
  }

  const map = getDeclinedMap(storage)
  map[normalizeEmail(email)] = Date.now()
  writeDeclinedMap(storage, map)
}

const hasDeclinedForEmail = (email: string) => {
  const storage = getStorage()
  if (!storage || !email) {
    return false
  }

  const map = getDeclinedMap(storage)
  return Boolean(map[normalizeEmail(email)])
}

const shouldPromptForEmail = (email: string) => {
  if (!email) {
    return false
  }

  const normalized = normalizeEmail(email)
  const saved = getSavedCredentials()

  if (saved && normalizeEmail(saved.email) === normalized) {
    return false
  }

  return !hasDeclinedForEmail(normalized)
}

export const credentialStorageService = {
  getSavedCredentials,
  hasSavedCredentials,
  saveCredentials,
  clearSavedCredentials,
  markDeclined,
  hasDeclinedForEmail,
  shouldPromptForEmail,
  removeDeclinedForEmail,
}

