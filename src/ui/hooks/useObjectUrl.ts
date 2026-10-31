import { useEffect, useState } from 'react'

/**
 * Object URL for a blob, revoked on change or unmount. Created inside an effect
 * so React StrictMode's double mount gets a fresh, valid URL.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url
}
