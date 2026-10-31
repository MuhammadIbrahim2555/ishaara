/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** iCloud link to the published iOS Shortcut. Unset until the Shortcut is published. */
  readonly VITE_IOS_SHORTCUT_URL?: string
}
