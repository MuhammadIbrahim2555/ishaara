import { beforeEach, describe, expect, it } from 'vitest'
import type { OcrResult } from '@/types/contracts'
import { createEngine } from '@/core/engine'
import { getServices } from '@/core/index'
import { createLibrary } from '@/core/library'

describe('createEngine end-to-end with fake OCR', () => {
  let fakeOcrResult: OcrResult = {
    fullText: '',
    words: [],
    width: 390,
    height: 844,
  }

  const fakeOcr = async (_img: Blob): Promise<OcrResult> => fakeOcrResult
  const library = createLibrary()

  beforeEach(async () => {
    await library.clear()
  })

  it('returns ask-family / unreadable when OCR has < 3 words', async () => {
    fakeOcrResult = {
      fullText: 'Hello world',
      words: [
        { text: 'Hello', box: { x: 0, y: 0, w: 0.1, h: 0.1 }, confidence: 90 },
        { text: 'world', box: { x: 0.1, y: 0, w: 0.1, h: 0.1 }, confidence: 90 },
      ],
      width: 390,
      height: 844,
    }

    const engine = createEngine({ ocr: fakeOcr, library })
    const res = await engine.analyze({
      image: new Blob(),
      task: 'photo',
      redactions: [],
    })

    expect(res.kind).toBe('ask-family')
    if (res.kind === 'ask-family') {
      expect(res.reason).toBe('unreadable')
    }
  })

  it('triggers safety-stop when OTP is detected in OCR', async () => {
    fakeOcrResult = {
      fullText: 'Your verification code and OTP is 123456',
      words: [
        { text: 'Your', box: { x: 0, y: 0, w: 0.1, h: 0.1 }, confidence: 90 },
        { text: 'verification', box: { x: 0.1, y: 0, w: 0.1, h: 0.1 }, confidence: 90 },
        { text: 'code', box: { x: 0.2, y: 0, w: 0.1, h: 0.1 }, confidence: 90 },
        { text: 'OTP', box: { x: 0.3, y: 0, w: 0.1, h: 0.1 }, confidence: 90 },
      ],
      width: 390,
      height: 844,
    }

    const engine = createEngine({ ocr: fakeOcr, library })
    const res = await engine.analyze({
      image: new Blob(),
      task: 'photo',
      redactions: [],
    })

    expect(res.kind).toBe('safety-stop')
    if (res.kind === 'safety-stop') {
      expect(res.reason).toBe('otp')
    }
  })

  it('creates lesson on wa_chat with camera step, then passes and appends wa_photo_picker on check', async () => {
    // 1. Fake OCR simulating wa_chat screen
    fakeOcrResult = {
      fullText: 'Type a message Camera Beta',
      words: [
        { text: 'Type', box: { x: 0.1, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
        { text: 'a', box: { x: 0.2, y: 0.9, w: 0.05, h: 0.05 }, confidence: 90 },
        { text: 'message', box: { x: 0.26, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
        { text: 'Beta', box: { x: 0.1, y: 0.05, w: 0.1, h: 0.05 }, confidence: 90 },
      ],
      width: 390,
      height: 844,
    }

    const engine = createEngine({ ocr: fakeOcr, library })
    const analyzeRes = await engine.analyze({
      image: new Blob(),
      task: 'photo',
      redactions: [],
    })

    expect(analyzeRes.kind).toBe('lesson')
    if (analyzeRes.kind !== 'lesson') return

    const lesson = analyzeRes.lesson
    expect(lesson.app).toBe('whatsapp')
    expect(lesson.task).toBe('photo')
    expect(lesson.parts.length).toBe(1)
    expect(lesson.parts[0].screenId).toBe('wa_chat')
    // Step should be camera button
    expect(lesson.parts[0].steps[0].labelEn).toBe('Camera')
    expect(lesson.parts[0].steps[0].expectNext).toBe('wa_photo_picker')

    // 2. Next user action: user pressed camera, now on wa_photo_picker screen
    fakeOcrResult = {
      fullText: 'Recents All Photos Albums Select',
      words: [
        { text: 'Recents', box: { x: 0.1, y: 0.05, w: 0.15, h: 0.05 }, confidence: 90 },
        { text: 'All', box: { x: 0.3, y: 0.05, w: 0.1, h: 0.05 }, confidence: 90 },
        { text: 'Photos', box: { x: 0.42, y: 0.05, w: 0.1, h: 0.05 }, confidence: 90 },
      ],
      width: 390,
      height: 844,
    }

    const checkRes = await engine.check({
      image: new Blob(),
      lessonId: lesson.id,
    })

    expect(checkRes.kind).toBe('pass')
    if (checkRes.kind === 'pass') {
      expect(checkRes.done).toBe(false)
      // Check that second part was appended to the lesson
      expect(checkRes.lesson.parts.length).toBe(2)
      expect(checkRes.lesson.parts[1].screenId).toBe('wa_photo_picker')
    }
  })

  it('completes the photo flow when the user is back in chat after pressing Send', async () => {
    const engine = createEngine({ ocr: fakeOcr, library })
    const plainOcr = (text: string): OcrResult => ({
      fullText: text,
      words: text
        .split(/\s+/)
        .map((t) => ({ text: t, box: { x: 0.1, y: 0.5, w: 0.1, h: 0.05 }, confidence: 90 })),
      width: 390,
      height: 844,
    })

    // 1. wa_chat: lesson starts with the camera step
    fakeOcrResult = {
      fullText: 'Type a message Camera Beta',
      words: [
        { text: 'Type', box: { x: 0.1, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
        { text: 'a', box: { x: 0.2, y: 0.9, w: 0.05, h: 0.05 }, confidence: 90 },
        { text: 'message', box: { x: 0.26, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
        { text: 'Beta', box: { x: 0.1, y: 0.05, w: 0.1, h: 0.05 }, confidence: 90 },
      ],
      width: 390,
      height: 844,
    }
    const analyzeRes = await engine.analyze({ image: new Blob(), task: 'photo', redactions: [] })
    expect(analyzeRes.kind).toBe('lesson')
    if (analyzeRes.kind !== 'lesson') return
    const lessonId = analyzeRes.lesson.id

    // 2. wa_photo_picker after tapping Camera
    fakeOcrResult = plainOcr('Recents All Photos Albums Select')
    let res = await engine.check({ image: new Blob(), lessonId })
    expect(res.kind).toBe('pass')
    if (res.kind === 'pass') expect(res.done).toBe(false)

    // 3. wa_photo_preview after tapping the photo
    fakeOcrResult = plainOcr('Add a caption')
    res = await engine.check({ image: new Blob(), lessonId })
    expect(res.kind).toBe('pass')
    if (res.kind === 'pass') {
      expect(res.done).toBe(false)
      expect(res.lesson.parts[2].screenId).toBe('wa_photo_preview')
    }

    // 4. Back in wa_chat after pressing Send -> whole task is done
    fakeOcrResult = plainOcr('Type a message Camera Beta')
    res = await engine.check({ image: new Blob(), lessonId })
    expect(res.kind).toBe('pass')
    if (res.kind === 'pass') {
      expect(res.done).toBe(true)
      expect(res.lesson.completed).toBe(true)
    }

    // One completed task -> level 2, and step passes did not count as completions
    const skill = await library.skill('photo')
    expect(skill.timesPassed).toBe(1)
    expect(skill.level).toBe(2)
  })

  it('wires getServices correctly in both mock and real modes', () => {
    const mockServices = getServices({ mock: true })
    expect(mockServices.engine).toBeDefined()
    expect(mockServices.speech).toBeDefined()
    expect(mockServices.library).toBeDefined()
    expect(mockServices.share).toBeDefined()
    expect(mockServices.voice).toBeDefined()
    expect(mockServices.translate).toBeDefined()
    expect(mockServices.capture).toBeDefined()
    expect(mockServices.models).toBeDefined()

    const realServices = getServices({ mock: false })
    expect(realServices.engine).toBeDefined()
    expect(realServices.speech).toBeDefined()
    expect(realServices.library).toBeDefined()
    expect(realServices.share).toBeDefined()
    expect(realServices.voice).toBeDefined()
    expect(realServices.translate).toBeDefined()
    expect(realServices.capture).toBeDefined()
    expect(realServices.models).toBeDefined()
  })

  it('passes near fallback through to vision and replaces target when confidence is 0.8', async () => {
    fakeOcrResult = {
      fullText: 'Type a message Camera Beta',
      words: [
        { text: 'Type', box: { x: 0.1, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
        { text: 'a', box: { x: 0.2, y: 0.9, w: 0.05, h: 0.05 }, confidence: 90 },
        { text: 'message', box: { x: 0.26, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
      ],
      width: 390,
      height: 844,
    }

    let capturedNear: [number, number] | undefined

    const visionMock = async (
      _img: Blob,
      phrase: string,
      near?: [number, number]
    ) => {
      capturedNear = near
      return {
        box: { x: 0.85, y: 0.92, w: 0.08, h: 0.08 },
        source: 'vision' as const,
        confidence: 0.8,
        label: phrase,
      }
    }

    const engine = createEngine({ ocr: fakeOcr, library, vision: visionMock })
    const res = await engine.analyze({
      image: new Blob(),
      task: 'photo',
      redactions: [],
    })

    expect(res.kind).toBe('lesson')
    if (res.kind === 'lesson') {
      expect(capturedNear).toEqual([0.86, 0.94])
      const step = res.lesson.parts[0].steps[0]
      expect(step.target.source).toBe('vision')
      expect(step.target.confidence).toBe(0.8)
    }
  })

  it('keeps fallback target when vision confidence is exactly 0.55 (below the 0.8 threshold)', async () => {
    fakeOcrResult = {
      fullText: 'Type a message Camera Beta',
      words: [
        { text: 'Type', box: { x: 0.1, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
        { text: 'a', box: { x: 0.2, y: 0.9, w: 0.05, h: 0.05 }, confidence: 90 },
        { text: 'message', box: { x: 0.26, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
      ],
      width: 390,
      height: 844,
    }

    const midConfidenceVision = async (_img: Blob, phrase: string) => ({
      box: { x: 0.5, y: 0.5, w: 0.1, h: 0.1 },
      source: 'vision' as const,
      confidence: 0.55,
      label: phrase,
    })

    const engine = createEngine({ ocr: fakeOcr, library, vision: midConfidenceVision })
    const res = await engine.analyze({ image: new Blob(), task: 'photo', redactions: [] })

    expect(res.kind).toBe('lesson')
    if (res.kind === 'lesson') {
      const step = res.lesson.parts[0].steps[0]
      expect(step.target.source).toBe('map-fallback')
    }
  })

  it('keeps fallback target when vision confidence is below 0.55', async () => {
    fakeOcrResult = {
      fullText: 'Type a message Camera Beta',
      words: [
        { text: 'Type', box: { x: 0.1, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
        { text: 'a', box: { x: 0.2, y: 0.9, w: 0.05, h: 0.05 }, confidence: 90 },
        { text: 'message', box: { x: 0.26, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
      ],
      width: 390,
      height: 844,
    }

    const lowConfidenceVision = async (
      _img: Blob,
      phrase: string,
      _near?: [number, number]
    ) => {
      return {
        box: { x: 0.5, y: 0.5, w: 0.1, h: 0.1 },
        source: 'vision' as const,
        confidence: 0.45,
        label: phrase,
      }
    }

    const engine = createEngine({
      ocr: fakeOcr,
      library,
      vision: lowConfidenceVision,
    })
    const res = await engine.analyze({
      image: new Blob(),
      task: 'photo',
      redactions: [],
    })

    expect(res.kind).toBe('lesson')
    if (res.kind === 'lesson') {
      const step = res.lesson.parts[0].steps[0]
      expect(step.target.source).toBe('map-fallback')
    }
  })

  it('returns ask-family / unreadable when OCR rejects during analyze', async () => {
    const rejectingOcr = async (_img: Blob): Promise<OcrResult> => {
      throw new Error('ocr-timeout')
    }

    const engine = createEngine({ ocr: rejectingOcr, library })
    const res = await engine.analyze({
      image: new Blob(),
      task: 'photo',
      redactions: [],
    })

    expect(res.kind).toBe('ask-family')
    if (res.kind === 'ask-family') {
      expect(res.reason).toBe('unreadable')
    }
  })

  it('returns unknown from check when OCR rejects during check', async () => {
    fakeOcrResult = {
      fullText: 'Type a message Camera Beta',
      words: [
        { text: 'Type', box: { x: 0.1, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
        { text: 'a', box: { x: 0.2, y: 0.9, w: 0.05, h: 0.05 }, confidence: 90 },
        { text: 'message', box: { x: 0.26, y: 0.9, w: 0.1, h: 0.05 }, confidence: 90 },
        { text: 'Beta', box: { x: 0.1, y: 0.05, w: 0.1, h: 0.05 }, confidence: 90 },
      ],
      width: 390,
      height: 844,
    }

    const workingEngine = createEngine({ ocr: fakeOcr, library })
    const analyzeRes = await workingEngine.analyze({
      image: new Blob(),
      task: 'photo',
      redactions: [],
    })
    expect(analyzeRes.kind).toBe('lesson')
    if (analyzeRes.kind !== 'lesson') return

    const rejectingOcr = async (_img: Blob): Promise<OcrResult> => {
      throw new Error('ocr-timeout')
    }
    const engine = createEngine({ ocr: rejectingOcr, library })
    const checkRes = await engine.check({
      image: new Blob(),
      lessonId: analyzeRes.lesson.id,
    })

    expect(checkRes.kind).toBe('unknown')
  })
})
