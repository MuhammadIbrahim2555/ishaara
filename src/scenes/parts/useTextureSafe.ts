import { useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { SRGBColorSpace, Texture, TextureLoader } from 'three'

/**
 * Loads an image as an sRGB texture and returns it once ready.
 * Returns null while loading, and stays null if the image fails, so callers
 * can render a plain-colour fallback instead of crashing. The texture is
 * disposed on url change and on unmount. Must be used inside a <Canvas>.
 */
export function useTextureSafe(url: string | undefined): Texture | null {
  const [tex, setTex] = useState<Texture | null>(null)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    if (!url) return
    let alive = true
    let loaded: Texture | null = null

    new TextureLoader().load(
      url,
      (t) => {
        if (!alive) {
          t.dispose()
          return
        }
        t.colorSpace = SRGBColorSpace
        loaded = t
        setTex(t)
        invalidate()
      },
      undefined,
      () => {
        // Missing or broken image: keep the fallback colour, never throw.
      },
    )

    return () => {
      alive = false
      setTex(null)
      loaded?.dispose()
      loaded = null
    }
  }, [url, invalidate])

  return tex
}
