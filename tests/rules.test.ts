import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import fs from 'node:fs'
import path from 'node:path'

const PROJECT_ID = 'ishaara-test-rules'

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment

  beforeAll(async () => {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules')
    const rules = fs.readFileSync(rulesPath, 'utf8')
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules },
    })
  })

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup()
    }
  })

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore()
    }
  })

  function makeValidElderDoc(eid: string, inviteCode: string) {
    return {
      elderId: eid,
      name: 'Ammi',
      skills: [],
      learnedCount: 0,
      weeklyCompleted: 0,
      callsSavedThisWeek: 0,
      updatedAt: Date.now(),
      inviteCode,
    }
  }

  describe('families/{fid}', () => {
    it('allows authenticated user to create family with self as owner and valid keys', async () => {
      const helperDb = testEnv.authenticatedContext('helper-1').firestore()
      await assertSucceeds(
        setDoc(doc(helperDb, 'families', 'fam-1'), {
          ownerUid: 'helper-1',
          ownerName: 'Beta',
          createdAt: Date.now(),
        }),
      )
    })

    it('denies family creation if ownerUid does not match auth.uid', async () => {
      const helperDb = testEnv.authenticatedContext('helper-1').firestore()
      await assertFails(
        setDoc(doc(helperDb, 'families', 'fam-1'), {
          ownerUid: 'helper-2',
          ownerName: 'Beta',
          createdAt: Date.now(),
        }),
      )
    })

    it('denies family creation with unauthorized keys', async () => {
      const helperDb = testEnv.authenticatedContext('helper-1').firestore()
      await assertFails(
        setDoc(doc(helperDb, 'families', 'fam-1'), {
          ownerUid: 'helper-1',
          ownerName: 'Beta',
          createdAt: Date.now(),
          extraKey: true,
        }),
      )
    })

    it('allows owner to read and update own family doc, but not change ownerUid', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'families', 'fam-1'), {
          ownerUid: 'helper-1',
          ownerName: 'Beta',
          createdAt: Date.now(),
        })
      })

      const ownerDb = testEnv.authenticatedContext('helper-1').firestore()
      const strangerDb = testEnv.authenticatedContext('stranger').firestore()

      await assertSucceeds(getDoc(doc(ownerDb, 'families', 'fam-1')))
      await assertFails(getDoc(doc(strangerDb, 'families', 'fam-1')))

      // Valid update
      await assertSucceeds(
        updateDoc(doc(ownerDb, 'families', 'fam-1'), {
          ownerName: 'Beta Updated',
        }),
      )

      // Cannot change ownerUid
      await assertFails(
        updateDoc(doc(ownerDb, 'families', 'fam-1'), {
          ownerUid: 'new-owner',
        }),
      )
    })
  })

  describe('invites/{code}', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'families', 'fam-1'), {
          ownerUid: 'helper-1',
          ownerName: 'Beta',
          createdAt: Date.now(),
        })
      })
    })

    it('allows family owner to create an invite with valid expiry within 30 min', async () => {
      const helperDb = testEnv.authenticatedContext('helper-1').firestore()
      const expiresAt = Timestamp.fromMillis(Date.now() + 15 * 60 * 1000)

      await assertSucceeds(
        setDoc(doc(helperDb, 'invites', 'CODE123'), {
          familyId: 'fam-1',
          ownerUid: 'helper-1',
          elderName: 'Ammi',
          expiresAt,
        }),
      )
    })

    it('denies invite creation if caller does not own the family', async () => {
      const strangerDb = testEnv.authenticatedContext('stranger').firestore()
      const expiresAt = Timestamp.fromMillis(Date.now() + 15 * 60 * 1000)

      await assertFails(
        setDoc(doc(strangerDb, 'invites', 'CODE123'), {
          familyId: 'fam-1',
          ownerUid: 'stranger',
          elderName: 'Ammi',
          expiresAt,
        }),
      )
    })

    it('denies invite creation if expiry exceeds 30 minutes', async () => {
      const helperDb = testEnv.authenticatedContext('helper-1').firestore()
      const farFuture = Timestamp.fromMillis(Date.now() + 60 * 60 * 1000)

      await assertFails(
        setDoc(doc(helperDb, 'invites', 'CODE123'), {
          familyId: 'fam-1',
          ownerUid: 'helper-1',
          elderName: 'Ammi',
          expiresAt: farFuture,
        }),
      )
    })

    it('denies unauthenticated get on invites', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'invites', 'CODE123'), {
          familyId: 'fam-1',
          ownerUid: 'helper-1',
          elderName: 'Ammi',
          expiresAt: Timestamp.fromMillis(Date.now() + 15 * 60 * 1000),
        })
      })

      const unauthDb = testEnv.unauthenticatedContext().firestore()
      await assertFails(getDoc(doc(unauthDb, 'invites', 'CODE123')))

      // Any signed-in user can read valid invite
      const elderDb = testEnv.authenticatedContext('elder-1').firestore()
      await assertSucceeds(getDoc(doc(elderDb, 'invites', 'CODE123')))
    })

    it('denies get on expired invites for signed-in users', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'invites', 'EXPIRED'), {
          familyId: 'fam-1',
          ownerUid: 'helper-1',
          elderName: 'Ammi',
          expiresAt: Timestamp.fromMillis(Date.now() - 1000),
        })
      })

      const elderDb = testEnv.authenticatedContext('elder-1').firestore()
      await assertFails(getDoc(doc(elderDb, 'invites', 'EXPIRED')))
    })

    it('denies list queries on invites collection', async () => {
      const helperDb = testEnv.authenticatedContext('helper-1').firestore()
      await assertFails(getDocs(collection(helperDb, 'invites')))
    })
  })

  describe('families/{fid}/elders/{eid}', () => {
    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore()
        await setDoc(doc(db, 'families', 'fam-1'), {
          ownerUid: 'helper-1',
          ownerName: 'Beta',
          createdAt: Date.now(),
        })
        await setDoc(doc(db, 'invites', 'CODE123'), {
          familyId: 'fam-1',
          ownerUid: 'helper-1',
          elderName: 'Ammi',
          expiresAt: Timestamp.fromMillis(Date.now() + 15 * 60 * 1000),
        })
        await setDoc(doc(db, 'invites', 'EXPIRED'), {
          familyId: 'fam-1',
          ownerUid: 'helper-1',
          elderName: 'Ammi',
          expiresAt: Timestamp.fromMillis(Date.now() - 1000),
        })
        await setDoc(doc(db, 'invites', 'OTHER_FAM'), {
          familyId: 'fam-2',
          ownerUid: 'helper-2',
          elderName: 'Ammi',
          expiresAt: Timestamp.fromMillis(Date.now() + 15 * 60 * 1000),
        })
      })
    })

    it('allows elder to create own doc with valid invite', async () => {
      const elderDb = testEnv.authenticatedContext('elder-1').firestore()
      const payload = makeValidElderDoc('elder-1', 'CODE123')

      await assertSucceeds(setDoc(doc(elderDb, 'families', 'fam-1', 'elders', 'elder-1'), payload))
    })

    it('denies elder creating doc with expired invite', async () => {
      const elderDb = testEnv.authenticatedContext('elder-1').firestore()
      const payload = makeValidElderDoc('elder-1', 'EXPIRED')

      await assertFails(setDoc(doc(elderDb, 'families', 'fam-1', 'elders', 'elder-1'), payload))
    })

    it('denies elder creating doc with invite for a different family', async () => {
      const elderDb = testEnv.authenticatedContext('elder-1').firestore()
      const payload = makeValidElderDoc('elder-1', 'OTHER_FAM')

      await assertFails(setDoc(doc(elderDb, 'families', 'fam-1', 'elders', 'elder-1'), payload))
    })

    it('denies elder creating doc with unauthorized extra fields (e.g. screenshot)', async () => {
      const elderDb = testEnv.authenticatedContext('elder-1').firestore()
      const payload = {
        ...makeValidElderDoc('elder-1', 'CODE123'),
        screenshot: 'data:image/png;base64,...',
      }

      await assertFails(setDoc(doc(elderDb, 'families', 'fam-1', 'elders', 'elder-1'), payload))
    })

    it('denies elder creating doc for another uid', async () => {
      const elderDb = testEnv.authenticatedContext('elder-1').firestore()
      const payload = makeValidElderDoc('elder-2', 'CODE123')

      await assertFails(setDoc(doc(elderDb, 'families', 'fam-1', 'elders', 'elder-2'), payload))
    })

    it('allows family owner to read elders, stranger cannot', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'families', 'fam-1', 'elders', 'elder-1'),
          makeValidElderDoc('elder-1', 'CODE123'),
        )
      })

      const ownerDb = testEnv.authenticatedContext('helper-1').firestore()
      const strangerDb = testEnv.authenticatedContext('stranger').firestore()

      await assertSucceeds(getDoc(doc(ownerDb, 'families', 'fam-1', 'elders', 'elder-1')))
      await assertSucceeds(getDocs(collection(ownerDb, 'families', 'fam-1', 'elders')))

      await assertFails(getDoc(doc(strangerDb, 'families', 'fam-1', 'elders', 'elder-1')))
      await assertFails(getDocs(collection(strangerDb, 'families', 'fam-1', 'elders')))
    })

    it('allows elder to update own doc but not change elderId or inviteCode', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'families', 'fam-1', 'elders', 'elder-1'),
          makeValidElderDoc('elder-1', 'CODE123'),
        )
      })

      const elderDb = testEnv.authenticatedContext('elder-1').firestore()
      const targetDoc = doc(elderDb, 'families', 'fam-1', 'elders', 'elder-1')

      // Valid update
      await assertSucceeds(
        setDoc(targetDoc, {
          ...makeValidElderDoc('elder-1', 'CODE123'),
          learnedCount: 2,
        }),
      )

      // Cannot change inviteCode
      await assertFails(
        setDoc(targetDoc, {
          ...makeValidElderDoc('elder-1', 'NEW_CODE'),
          learnedCount: 2,
        }),
      )

      // Cannot change elderId
      await assertFails(
        setDoc(targetDoc, {
          ...makeValidElderDoc('elder-other', 'CODE123'),
          learnedCount: 2,
        }),
      )
    })

    it('allows delete by elder or family owner, but stranger cannot delete', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(
          doc(context.firestore(), 'families', 'fam-1', 'elders', 'elder-1'),
          makeValidElderDoc('elder-1', 'CODE123'),
        )
      })

      const strangerDb = testEnv.authenticatedContext('stranger').firestore()
      const ownerDb = testEnv.authenticatedContext('helper-1').firestore()

      await assertFails(deleteDoc(doc(strangerDb, 'families', 'fam-1', 'elders', 'elder-1')))
      await assertSucceeds(deleteDoc(doc(ownerDb, 'families', 'fam-1', 'elders', 'elder-1')))
    })
  })
})
