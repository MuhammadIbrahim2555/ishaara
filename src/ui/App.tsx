import '@fontsource/noto-nastaliq-urdu/400.css'
import '@fontsource/noto-nastaliq-urdu/700.css'
import '@fontsource/atkinson-hyperlegible-next/400.css'
import '@fontsource/atkinson-hyperlegible-next/700.css'
import '@fontsource/atkinson-hyperlegible-next/800.css'
import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Ask } from '@/screens/Ask'
import { Check } from '@/screens/Check'
import Family from '@/screens/Family'
import { Home } from '@/screens/Home'
import Join from '@/screens/Join'
import Judge from '@/screens/Judge'
import { Lesson } from '@/screens/Lesson'
import { Library } from '@/screens/Library'
import { Progress } from '@/screens/Progress'
import { Settings } from '@/screens/Settings'
import { Setup } from '@/screens/Setup'
import { Welcome } from '@/screens/Welcome'
import { useUiStore } from '@/ui/store'

/** Mirrors the settings onto <html> (lang, dir, text size, contrast, simple mode). */
function useApplySettings() {
  const settings = useUiStore((s) => s.settings)
  useEffect(() => {
    const root = document.documentElement
    root.lang = settings.lang
    root.dir = settings.lang === 'ur' ? 'rtl' : 'ltr'
    root.dataset.text = settings.textSize
    root.dataset.contrast = settings.contrast
    root.dataset.simple = String(settings.simpleMode)
  }, [settings])
}

function Root() {
  const onboarded = useUiStore((s) => s.settings.onboarded)
  return onboarded ? <Navigate to="/home" replace /> : <Welcome />
}

export default function App() {
  useApplySettings()
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/home" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/ask/:task" element={<Ask />} />
        <Route path="/lesson/:id" element={<Lesson />} />
        <Route path="/check/:id" element={<Check />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/family" element={<Family />} />
        <Route path="/join" element={<Join />} />
        <Route path="/judge" element={<Judge />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
