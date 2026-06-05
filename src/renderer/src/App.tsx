import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import type { Route } from './components/Sidebar'
import { Toaster } from './components/Toaster'
import { UploadModals } from './components/UploadModals'
import { Logo } from './components/Logo'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Sales } from './pages/Sales'
import { Coaching } from './pages/Coaching'
import { Reviews } from './pages/Reviews'
import { Settings } from './pages/Settings'
import { ForcePasswordChange } from './pages/ForcePasswordChange'
import { useAuth } from './store/auth'
import { useReports } from './store/reports'

export default function App(): JSX.Element {
  const { user, ready, bootstrap } = useAuth()
  const initLocations = useReports((s) => s.initLocations)
  const resetReports = useReports((s) => s.reset)
  const [route, setRoute] = useState<Route>('dashboard')

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  // When a user signs in, scope the active-location filter to what they may view.
  useEffect(() => {
    if (user) initLocations(user.locations)
    else resetReports()
  }, [user, initLocations, resetReports])

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-brand-light">
        <div className="animate-pulse">
          <Logo />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <Login />
        <Toaster />
      </>
    )
  }

  if (user.mustChangePassword) {
    return (
      <>
        <ForcePasswordChange />
        <Toaster />
      </>
    )
  }

  return (
    <div className="flex h-full overflow-hidden bg-brand-light">
      <Sidebar route={route} onNavigate={setRoute} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1200px] px-8 py-8 fade-in" key={route}>
          {route === 'dashboard' && <Dashboard onNavigate={setRoute} />}
          {route === 'sales' && <Sales />}
          {route === 'coaching' && <Coaching />}
          {route === 'reviews' && <Reviews />}
          {route === 'settings' && <Settings />}
        </div>
      </main>
      <Toaster />
      <UploadModals />
    </div>
  )
}
