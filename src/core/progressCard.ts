import type { ProgressSummary, TaskId } from '@/types/contracts'

const WIDTH = 1080
const HEIGHT = 1350

const TASK_NAMES_URDU: Record<TaskId, string> = {
  photo: 'تصویر بنانا',
  video_call: 'ویڈیو کال',
  voice_note: 'آواز کا پیغام',
  send_money: 'پیسے بھیجنا',
}

const LEVEL_LABELS_URDU: Record<number, string> = {
  1: 'ویڈیو دیکھی',
  2: 'اشارہ کافی تھا',
  3: 'خود کر لیا!',
}

/**
 * Renders a 1080x1350 shareable progress card as a PNG Blob.
 * Uses OffscreenCanvas when available, falling back to HTMLCanvasElement.
 */
export async function renderProgressCard(
  summary: ProgressSummary,
  opts?: { elderName?: string },
): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts?.load) {
    await document.fonts.load('32px "Noto Nastaliq Urdu"').catch(() => {})
  }

  let canvas: OffscreenCanvas | HTMLCanvasElement
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(WIDTH, HEIGHT)
    ctx = canvas.getContext('2d')
  } else if (typeof document !== 'undefined' && document.createElement) {
    const htmlCanvas = document.createElement('canvas')
    htmlCanvas.width = WIDTH
    htmlCanvas.height = HEIGHT
    canvas = htmlCanvas
    ctx = htmlCanvas.getContext('2d')
  } else {
    throw new Error('Canvas not supported in this environment')
  }

  if (!ctx) {
    throw new Error('Failed to obtain 2D rendering context')
  }

  const setRtl = () => {
    try {
      if ('direction' in ctx!) {
        ctx!.direction = 'rtl'
      }
    } catch {
      // ignore if unsupported
    }
  }

  // 1. Background: Cream #FBF7F0
  ctx.fillStyle = '#FBF7F0'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // 2. Title: Teal #0F5257 "اشارہ — میری ترقی"
  setRtl()
  ctx.fillStyle = '#0F5257'
  ctx.font = 'bold 60px "Noto Nastaliq Urdu", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('اشارہ — میری ترقی', WIDTH / 2, 140)

  // Optional elder name
  if (opts?.elderName) {
    ctx.fillStyle = '#3B6E71'
    ctx.font = '32px "Noto Nastaliq Urdu", system-ui, sans-serif'
    ctx.fillText(opts.elderName, WIDTH / 2, 210)
  }

  // 3. Big number learnedCount with "چیزیں خود سیکھ لیں"
  ctx.fillStyle = '#0F5257'
  ctx.font = 'bold 150px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(summary.learnedCount ?? 0), WIDTH / 2, 350)

  setRtl()
  ctx.fillStyle = '#2D3748'
  ctx.font = '36px "Noto Nastaliq Urdu", system-ui, sans-serif'
  ctx.fillText('چیزیں خود سیکھ لیں', WIDTH / 2, 450)

  // 4. One row per skill: Urdu task name + level label
  const skillsToRender =
    summary.skills && summary.skills.length > 0
      ? summary.skills
      : ([
          { task: 'photo', level: 1 },
          { task: 'video_call', level: 1 },
          { task: 'voice_note', level: 1 },
          { task: 'send_money', level: 1 },
        ] as const)

  const startY = 560
  const rowHeight = 120
  const cardWidth = 840
  const cardX = (WIDTH - cardWidth) / 2

  skillsToRender.forEach((skill, index) => {
    const y = startY + index * rowHeight
    const taskName = TASK_NAMES_URDU[skill.task] || skill.task
    const levelLabel = LEVEL_LABELS_URDU[skill.level] || LEVEL_LABELS_URDU[1]

    // Row container background
    ctx!.fillStyle = '#FFFFFF'
    ctx!.beginPath()
    if (typeof ctx!.roundRect === 'function') {
      ctx!.roundRect(cardX, y, cardWidth, 96, 16)
    } else {
      ctx!.rect(cardX, y, cardWidth, 96)
    }
    ctx!.fill()

    ctx!.strokeStyle = '#E2DCD2'
    ctx!.lineWidth = 1.5
    ctx!.stroke()

    // Level label on left
    setRtl()
    let levelColor = '#6B7280'
    if (skill.level === 3) levelColor = '#0F5257'
    else if (skill.level === 2) levelColor = '#D97706'

    ctx!.fillStyle = levelColor
    ctx!.font = 'bold 28px "Noto Nastaliq Urdu", system-ui, sans-serif'
    ctx!.textAlign = 'left'
    ctx!.textBaseline = 'middle'
    ctx!.fillText(levelLabel, cardX + 36, y + 48)

    // Task name on right
    setRtl()
    ctx!.fillStyle = '#1A202C'
    ctx!.font = 'bold 32px "Noto Nastaliq Urdu", system-ui, sans-serif'
    ctx!.textAlign = 'right'
    ctx!.textBaseline = 'middle'
    ctx!.fillText(taskName, cardX + cardWidth - 36, y + 48)
  })

  // 5. Footer: "Ishaara · سب کچھ میرے فون پر"
  setRtl()
  ctx.fillStyle = '#718096'
  ctx.font = '28px "Noto Nastaliq Urdu", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Ishaara · سب کچھ میرے فون پر', WIDTH / 2, 1260)

  // 6. Convert canvas to blob
  if ('convertToBlob' in canvas && typeof canvas.convertToBlob === 'function') {
    return await canvas.convertToBlob({ type: 'image/png' })
  }

  if ('toBlob' in canvas && typeof canvas.toBlob === 'function') {
    return await new Promise<Blob>((resolve, reject) => {
      ;(canvas as HTMLCanvasElement).toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('toBlob failed'))
        }
      }, 'image/png')
    })
  }

  throw new Error('Canvas conversion to blob is unsupported')
}
