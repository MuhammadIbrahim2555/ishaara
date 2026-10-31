/**
 * Fingertip anchor of the photoreal hand frames (public/assets/hand-point.webp and
 * hand-press.webp). Both frames share one crop, so one anchor serves both.
 * u / v are fractions of the picture, measured from the top-left corner.
 * aspect is width / height of the exported frames (720 x 750).
 */
export const HAND_ANCHOR = { u: 0.0408, v: 0.0289, aspect: 720 / 750 } as const
