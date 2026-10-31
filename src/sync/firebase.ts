import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

export interface FirebaseServices {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let cached: FirebaseServices | null = null
let inflight: Promise<FirebaseServices | null> | null = null

/**
 * Lazily initializes and returns Firebase services (app, auth, firestore).
 * Returns null if any required environment variable is missing.
 * Dynamically imports Firebase modules so the initial bundle stays lean.
 */
export async function getFirebase(): Promise<FirebaseServices | null> {
  if (cached) return cached
  if (inflight) return inflight

  inflight = (async () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
    const appId = import.meta.env.VITE_FIREBASE_APP_ID

    if (!apiKey || !authDomain || !projectId || !appId) {
      return null
    }

    const [{ initializeApp, getApps, getApp }, authMod, firestoreMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ])

    const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
    const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID

    const firebaseConfig = {
      apiKey,
      authDomain,
      projectId,
      appId,
      ...(storageBucket ? { storageBucket } : {}),
      ...(messagingSenderId ? { messagingSenderId } : {}),
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

    let auth: Auth
    try {
      auth = authMod.initializeAuth(app, {
        persistence: authMod.browserLocalPersistence,
      })
    } catch {
      auth = authMod.getAuth(app)
      authMod.setPersistence(auth, authMod.browserLocalPersistence).catch(() => {})
    }

    let db: Firestore
    try {
      db = firestoreMod.initializeFirestore(app, {
        localCache: firestoreMod.persistentLocalCache(),
      })
    } catch {
      db = firestoreMod.getFirestore(app)
    }

    cached = { app, auth, db }
    return cached
  })()

  try {
    return await inflight
  } finally {
    if (!cached) {
      inflight = null
    }
  }
}
