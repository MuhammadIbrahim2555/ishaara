import type {
  ElderProgressDoc,
  ElderSkillShare,
  FamilyService,
  FamilyUser,
  JoinResult,
  ProgressSummary,
} from '@/types/contracts'
import { getFirebase, type FirebaseServices } from './firebase'
import { newInviteCode, normaliseCode } from './inviteCode'

const STORAGE_FAMILY_KEY = 'ishaara.family.v1'
const STORAGE_SHARING_KEY = 'ishaara.sharing.v1'
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

export interface FamilyServiceDeps {
  getFb?: () => Promise<FirebaseServices | null>
  storage?: Storage
  now?: () => number
  debounceMs?: number
  writeElderDoc?: (
    familyId: string,
    elderId: string,
    data: ElderProgressDoc,
  ) => Promise<void>
}

function createInMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

/**
 * Creates the production FamilyService using Firebase Auth & Firestore.
 */
export function createFamily(deps?: FamilyServiceDeps): FamilyService {
  const getFb = deps?.getFb ?? getFirebase
  const getNow = deps?.now ?? (() => Date.now())
  const debounceMs = deps?.debounceMs ?? 3000
  const storage =
    deps?.storage ??
    (typeof localStorage !== 'undefined' ? localStorage : createInMemoryStorage())

  let cachedUser: FamilyUser | null = null
  let pushTimer: ReturnType<typeof setTimeout> | null = null
  let latestSummary: ProgressSummary | null = null

  function checkAvailable(): boolean {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
    const appId = import.meta.env.VITE_FIREBASE_APP_ID
    return Boolean(apiKey && authDomain && projectId && appId)
  }

  function getLinked(): { familyId: string; elderName: string } | null {
    try {
      const raw = storage.getItem(STORAGE_FAMILY_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function isSharing(): boolean {
    try {
      return storage.getItem(STORAGE_SHARING_KEY) === 'true'
    } catch {
      return false
    }
  }

  async function executePush(summary: ProgressSummary): Promise<void> {
    if (!isSharing()) return
    const linked = getLinked()
    if (!linked) return

    const fb = await getFb().catch(() => null)
    const elderId = fb?.auth.currentUser?.uid
    if (!elderId && !deps?.writeElderDoc) return

    const skills: ElderSkillShare[] = summary.skills.map((s) => ({
      task: s.task,
      level: s.level,
      stuck: Boolean(s.stuck),
      lastPracticed: s.lastPracticed,
    }))

    const docData: ElderProgressDoc = {
      elderId: elderId || 'anonymous',
      name: linked.elderName,
      skills,
      learnedCount: summary.learnedCount,
      weeklyCompleted: summary.weeklyCompleted,
      callsSavedThisWeek: summary.callsSavedThisWeek,
      updatedAt: getNow(),
    }

    if (deps?.writeElderDoc) {
      await deps.writeElderDoc(linked.familyId, docData.elderId, docData)
      return
    }

    if (!fb) return

    try {
      const firestoreMod = await import('firebase/firestore')
      const elderDocRef = firestoreMod.doc(
        fb.db,
        'families',
        linked.familyId,
        'elders',
        docData.elderId,
      )
      await firestoreMod.setDoc(elderDocRef, docData, { merge: true })
    } catch {
      // Swallowed: offline persistent cache will sync once online
    }
  }

  return {
    available(): boolean {
      return checkAvailable()
    },

    onAuth(cb: (u: FamilyUser | null) => void): () => void {
      if (!checkAvailable()) {
        cb(null)
        return () => {}
      }

      let unsubAuth: (() => void) | null = null
      let active = true

      getFb()
        .then((fb) => {
          if (!fb || !active) {
            cb(null)
            return
          }
          unsubAuth = fb.auth.onAuthStateChanged((user) => {
            if (!active) return
            if (user) {
              cachedUser = {
                uid: user.uid,
                name: user.displayName ?? null,
                isAnonymous: user.isAnonymous,
              }
            } else {
              cachedUser = null
            }
            cb(cachedUser)
          })
        })
        .catch(() => {
          if (active) cb(null)
        })

      return () => {
        active = false
        if (unsubAuth) unsubAuth()
      }
    },

    currentUser(): FamilyUser | null {
      return cachedUser
    },

    async signInWithGoogle(): Promise<FamilyUser | null> {
      const fb = await getFb()
      if (!fb) return null

      const authMod = await import('firebase/auth')
      const provider = new authMod.GoogleAuthProvider()

      try {
        const cred = await authMod.signInWithPopup(fb.auth, provider)
        cachedUser = {
          uid: cred.user.uid,
          name: cred.user.displayName ?? null,
          isAnonymous: cred.user.isAnonymous,
        }
        return cachedUser
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code
        if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
          await authMod.signInWithRedirect(fb.auth, provider)
          return null
        }
        throw err
      }
    },

    async signOut(): Promise<void> {
      const fb = await getFb()
      if (!fb) return
      const authMod = await import('firebase/auth')
      await authMod.signOut(fb.auth)
      cachedUser = null
    },

    async ensureFamily(): Promise<{ familyId: string }> {
      const fb = await getFb()
      if (!fb) throw new Error('Firebase unavailable')

      const user = fb.auth.currentUser
      if (!user) throw new Error('User not signed in')

      const firestoreMod = await import('firebase/firestore')
      const familiesCol = firestoreMod.collection(fb.db, 'families')
      const q = firestoreMod.query(
        familiesCol,
        firestoreMod.where('ownerUid', '==', user.uid),
        firestoreMod.limit(1),
      )
      const snap = await firestoreMod.getDocs(q)

      if (!snap.empty) {
        return { familyId: snap.docs[0].id }
      }

      const newRef = firestoreMod.doc(familiesCol)
      await firestoreMod.setDoc(newRef, {
        ownerUid: user.uid,
        ownerName: user.displayName || 'Helper',
        createdAt: firestoreMod.serverTimestamp(),
      })

      return { familyId: newRef.id }
    },

    async createInvite(
      familyId: string,
      elderName: string,
    ): Promise<{ code: string; expiresAt: number; url: string }> {
      const fb = await getFb()
      if (!fb) throw new Error('Firebase unavailable')

      const user = fb.auth.currentUser
      if (!user) throw new Error('User not signed in')

      const code = newInviteCode()
      const now = getNow()
      const expiresAt = now + FIFTEEN_MINUTES_MS

      const firestoreMod = await import('firebase/firestore')
      const inviteRef = firestoreMod.doc(fb.db, 'invites', code)
      await firestoreMod.setDoc(inviteRef, {
        familyId,
        ownerUid: user.uid,
        elderName: elderName.trim().slice(0, 40),
        expiresAt: firestoreMod.Timestamp.fromMillis(expiresAt),
      })

      const origin =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : ''

      return {
        code,
        expiresAt,
        url: `${origin}/join?code=${code}`,
      }
    },

    watchElders(familyId: string, cb: (elders: ElderProgressDoc[]) => void): () => void {
      let unsub: (() => void) | null = null
      let active = true

      getFb()
        .then(async (fb) => {
          if (!fb || !active) {
            cb([])
            return
          }
          const firestoreMod = await import('firebase/firestore')
          const eldersCol = firestoreMod.collection(fb.db, 'families', familyId, 'elders')
          const q = firestoreMod.query(eldersCol, firestoreMod.orderBy('name'))
          unsub = firestoreMod.onSnapshot(
            q,
            (snap) => {
              if (!active) return
              const list: ElderProgressDoc[] = snap.docs.map((docSnap) => {
                const d = docSnap.data()
                return {
                  elderId: d.elderId ?? docSnap.id,
                  name: d.name ?? '',
                  skills: Array.isArray(d.skills) ? d.skills : [],
                  learnedCount: Number(d.learnedCount) || 0,
                  weeklyCompleted: Number(d.weeklyCompleted) || 0,
                  callsSavedThisWeek: Number(d.callsSavedThisWeek) || 0,
                  updatedAt: Number(d.updatedAt) || 0,
                }
              })
              cb(list)
            },
            () => {
              if (active) cb([])
            },
          )
        })
        .catch(() => {
          if (active) cb([])
        })

      return () => {
        active = false
        if (unsub) unsub()
      }
    },

    async joinWithCode(code: string): Promise<JoinResult> {
      const fb = await getFb()
      if (!fb) return { ok: false, error: 'unavailable' }

      const clean = normaliseCode(code)
      if (!clean) {
        return { ok: false, error: 'invalid' }
      }

      const authMod = await import('firebase/auth')
      const firestoreMod = await import('firebase/firestore')

      let user = fb.auth.currentUser
      if (!user) {
        try {
          const cred = await authMod.signInAnonymously(fb.auth)
          user = cred.user
        } catch {
          return { ok: false, error: 'offline' }
        }
      }

      let inviteSnap
      try {
        const inviteRef = firestoreMod.doc(fb.db, 'invites', clean)
        inviteSnap = await firestoreMod.getDoc(inviteRef)
      } catch {
        return { ok: false, error: 'offline' }
      }

      if (!inviteSnap.exists()) {
        return { ok: false, error: 'invalid' }
      }

      const inv = inviteSnap.data()
      const expiresAtMillis =
        typeof inv.expiresAt?.toMillis === 'function'
          ? inv.expiresAt.toMillis()
          : Number(inv.expiresAt)

      if (getNow() > expiresAtMillis) {
        return { ok: false, error: 'expired' }
      }

      const familyId = String(inv.familyId)
      const elderName = String(inv.elderName || 'Elder')
      const elderDoc = {
        elderId: user.uid,
        name: elderName,
        skills: [] as ElderSkillShare[],
        learnedCount: 0,
        weeklyCompleted: 0,
        callsSavedThisWeek: 0,
        updatedAt: getNow(),
        inviteCode: clean,
      }

      try {
        const elderRef = firestoreMod.doc(fb.db, 'families', familyId, 'elders', user.uid)
        await firestoreMod.setDoc(elderRef, elderDoc)
      } catch {
        return { ok: false, error: 'offline' }
      }

      try {
        storage.setItem(STORAGE_FAMILY_KEY, JSON.stringify({ familyId, elderName }))
        storage.setItem(STORAGE_SHARING_KEY, 'false')
      } catch {
        // ignore storage quota errors
      }

      return { ok: true, familyId, elderName }
    },

    linkedFamily(): { familyId: string; elderName: string } | null {
      return getLinked()
    },

    sharing(): boolean {
      return isSharing()
    },

    async setSharing(on: boolean): Promise<void> {
      try {
        storage.setItem(STORAGE_SHARING_KEY, on ? 'true' : 'false')
      } catch {
        // ignore
      }

      if (!on) {
        const linked = getLinked()
        if (linked) {
          const fb = await getFb().catch(() => null)
          const uid =
            fb?.auth.currentUser?.uid || (deps?.writeElderDoc ? 'anonymous' : undefined)
          if (uid) {
            const resetDoc: ElderProgressDoc = {
              elderId: uid,
              name: linked.elderName,
              skills: [],
              learnedCount: 0,
              weeklyCompleted: 0,
              callsSavedThisWeek: 0,
              updatedAt: getNow(),
            }
            if (deps?.writeElderDoc) {
              await deps.writeElderDoc(linked.familyId, uid, resetDoc).catch(() => {})
            } else if (fb) {
              const firestoreMod = await import('firebase/firestore')
              const elderRef = firestoreMod.doc(
                fb.db,
                'families',
                linked.familyId,
                'elders',
                uid,
              )
              await firestoreMod.setDoc(elderRef, resetDoc, { merge: true }).catch(() => {})
            }
          }
        }
      }
    },

    async pushProgress(summary: ProgressSummary): Promise<void> {
      if (!isSharing()) return
      const linked = getLinked()
      if (!linked) return

      latestSummary = summary

      if (debounceMs <= 0) {
        await executePush(summary)
        return
      }

      if (pushTimer) {
        clearTimeout(pushTimer)
      }

      pushTimer = setTimeout(() => {
        if (latestSummary) {
          executePush(latestSummary).catch(() => {})
        }
      }, debounceMs)
    },

    async unlinkAndDelete(): Promise<void> {
      const linked = getLinked()
      const fb = await getFb().catch(() => null)
      const user = fb?.auth.currentUser

      if (linked && user && fb) {
        try {
          const firestoreMod = await import('firebase/firestore')
          const elderRef = firestoreMod.doc(
            fb.db,
            'families',
            linked.familyId,
            'elders',
            user.uid,
          )
          await firestoreMod.deleteDoc(elderRef)
        } catch {
          // ignore
        }
      }

      try {
        storage.removeItem(STORAGE_FAMILY_KEY)
        storage.removeItem(STORAGE_SHARING_KEY)
      } catch {
        // ignore
      }

      if (user && fb) {
        try {
          const authMod = await import('firebase/auth')
          await authMod.signOut(fb.auth)
        } catch {
          // ignore
        }
      }
      cachedUser = null
    },
  }
}

/**
 * Creates an in-memory mock FamilyService for development and testing.
 */
export function createMockFamily(): FamilyService {
  let isSharingEnabled = false
  let linked: { familyId: string; elderName: string } | null = {
    familyId: 'mock-family-123',
    elderName: 'Ammi',
  }

  const mockHelper: FamilyUser = {
    uid: 'mock-helper-beta',
    name: 'Beta',
    isAnonymous: false,
  }

  const mockElderDoc: ElderProgressDoc = {
    elderId: 'mock-elder-ammi',
    name: 'Ammi',
    skills: [
      { task: 'photo', level: 3, stuck: false, lastPracticed: Date.now() - 3600000 },
      { task: 'video_call', level: 2, stuck: false, lastPracticed: Date.now() - 7200000 },
      { task: 'voice_note', level: 1, stuck: true, lastPracticed: Date.now() - 86400000 },
      { task: 'send_money', level: 1, stuck: false, lastPracticed: Date.now() - 172800000 },
    ],
    learnedCount: 1,
    weeklyCompleted: 3,
    callsSavedThisWeek: 4,
    updatedAt: Date.now(),
  }

  return {
    available(): boolean {
      return true
    },
    onAuth(cb: (u: FamilyUser | null) => void): () => void {
      cb(mockHelper)
      return () => {}
    },
    currentUser(): FamilyUser | null {
      return mockHelper
    },
    async signInWithGoogle(): Promise<FamilyUser | null> {
      return mockHelper
    },
    async signOut(): Promise<void> {},
    async ensureFamily(): Promise<{ familyId: string }> {
      return { familyId: 'mock-family-123' }
    },
    async createInvite(
      _familyId: string,
      _elderName: string,
    ): Promise<{ code: string; expiresAt: number; url: string }> {
      const code = 'TEST-CODE'
      const expiresAt = Date.now() + FIFTEEN_MINUTES_MS
      return {
        code,
        expiresAt,
        url: `https://ishaara.app/join?code=${code}`,
      }
    },
    watchElders(_familyId: string, cb: (elders: ElderProgressDoc[]) => void): () => void {
      cb([mockElderDoc])
      return () => {}
    },
    async joinWithCode(code: string): Promise<JoinResult> {
      if (!code) return { ok: false, error: 'invalid' }
      linked = { familyId: 'mock-family-123', elderName: 'Ammi' }
      isSharingEnabled = false
      return { ok: true, familyId: linked.familyId, elderName: linked.elderName }
    },
    linkedFamily(): { familyId: string; elderName: string } | null {
      return linked
    },
    sharing(): boolean {
      return isSharingEnabled
    },
    async setSharing(on: boolean): Promise<void> {
      isSharingEnabled = on
    },
    async pushProgress(_summary: ProgressSummary): Promise<void> {},
    async unlinkAndDelete(): Promise<void> {
      linked = null
      isSharingEnabled = false
    },
  }
}
