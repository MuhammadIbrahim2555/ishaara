/** Asks the browser to keep this site's storage (phones may otherwise evict it). Never throws. */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // Unsupported or denied: the app keeps working, the browser may clear storage under pressure.
  }
}

/** True when the browser has granted persistent storage. False when unsupported or unknown. */
export async function isPersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) === true
  } catch {
    return false
  }
}
