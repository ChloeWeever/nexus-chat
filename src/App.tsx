import { useEffect } from 'react'
import { useAppStore } from '@/store'
import Sidebar from '@/components/sidebar/Sidebar'
import ChatWindow from '@/components/chat/ChatWindow'
import WelcomeScreen from '@/components/chat/WelcomeScreen'

export default function App(): JSX.Element {
  const { settings, activeConversationId } = useAppStore()

  // Apply theme
  useEffect(() => {
    const root = document.documentElement
    const { theme } = settings.appearance

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
  }, [settings.appearance.theme])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        {activeConversationId ? <ChatWindow /> : <WelcomeScreen />}
      </main>
    </div>
  )
}
