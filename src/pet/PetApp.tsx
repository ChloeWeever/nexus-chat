import { useState, useEffect, useRef, useCallback } from 'react'
import PetCharacter from './PetCharacter'
import CodexSprite from './CodexSprite'
import type { PetConfig } from '@/types'

const CLICK_MESSAGES = ['Meow~', 'Purrrr...', 'Nyaa~', '*yawn*', '...', 'Feed me!', 'Pet me!']

export default function PetApp(): JSX.Element {
  const [petConfig, setPetConfig] = useState<PetConfig | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [jumping, setJumping] = useState(false)
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mouseDownRef = useRef<{ time: number; screenX: number; screenY: number } | null>(null)

  const showMessage = useCallback((text: string) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current)
    setMessage(text)
    messageTimerRef.current = setTimeout(() => setMessage(null), 3000)
  }, [])

  const triggerJump = useCallback(() => {
    if (jumping) return
    setJumping(true)
    if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current)
    jumpTimerRef.current = setTimeout(() => setJumping(false), 500)
  }, [jumping])

  // Load initial pet config and listen for updates
  useEffect(() => {
    window.api.pet.getConfig().then(setPetConfig)
    return window.api.pet.onConfig(setPetConfig)
  }, [])

  // Listen for messages from main window (e.g. when AI finishes a response)
  useEffect(() => {
    return window.api.pet.onMessage((text) => {
      showMessage(text)
      triggerJump()
    })
  }, [showMessage, triggerJump])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    mouseDownRef.current = { time: Date.now(), screenX: e.screenX, screenY: e.screenY }
    window.api.pet.startDrag({ screenX: e.screenX, screenY: e.screenY })
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    window.api.pet.stopDrag()
    if (mouseDownRef.current) {
      const dt = Date.now() - mouseDownRef.current.time
      const dist = Math.hypot(e.screenX - mouseDownRef.current.screenX, e.screenY - mouseDownRef.current.screenY)
      mouseDownRef.current = null
      if (dt < 300 && dist < 6) {
        triggerJump()
        showMessage(CLICK_MESSAGES[Math.floor(Math.random() * CLICK_MESSAGES.length)])
      }
    }
  }, [triggerJump, showMessage])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    window.api.pet.hide()
  }, [])

  return (
    <div
      style={{
        width: '170px',
        height: '215px',
        position: 'relative',
        overflow: 'visible',
        background: 'transparent',
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* Speech bubble */}
      {message && (
        <div
          style={{
            position: 'absolute',
            bottom: '175px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.96)',
            color: '#333',
            padding: '5px 11px',
            borderRadius: '14px',
            fontSize: '13px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
            border: '1px solid rgba(0,0,0,0.08)',
            animation: 'bubbleIn 0.2s ease',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {message}
          <div
            style={{
              position: 'absolute',
              bottom: '-7px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid rgba(255,255,255,0.96)',
            }}
          />
        </div>
      )}

      {/* Pet character */}
      <div style={{ position: 'absolute', bottom: 0, left: 0 }}>
        {petConfig ? (
          <CodexSprite
            spritesheetUrl={petConfig.spritesheetUrl}
            state="idle"
            jumping={jumping}
            displayWidth={160}
          />
        ) : (
          <PetCharacter jumping={jumping} />
        )}
      </div>

      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
