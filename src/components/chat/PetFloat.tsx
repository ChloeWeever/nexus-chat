import { useState, useRef, useCallback, useEffect } from 'react'
import { useAppStore } from '@/store'
import CodexSprite, { type CodexState } from '@/pet/CodexSprite'

const PET_WIDTH = 80
const CLICK_MESSAGES = ['...', 'Focus!', 'On it!', '*yawn*', 'Meow~']
const WALK_SPEED = 1.5
const WALK_TICK_MS = 16

const SAVED_POS_KEY = 'pet-float-pos'

function loadPos(): { bottom: number; right: number } {
  try {
    const s = localStorage.getItem(SAVED_POS_KEY)
    if (s) return JSON.parse(s)
  } catch { /* ignore */ }
  return { bottom: 20, right: 20 }
}

export default function PetFloat(): JSX.Element | null {
  const { settings, isStreaming, activeConversationId, conversations } = useAppStore()
  const pet = settings.pet
  const petWander = settings.petWander !== false

  const [pos, setPos] = useState(loadPos)
  const [message, setMessage] = useState<string | null>(null)
  const [jumping, setJumping] = useState(false)
  const [spriteState, setSpriteState] = useState<CodexState>('idle')

  // Derive thinking phase: streaming but statusText still set, no content yet
  const activeConv = conversations.find(c => c.id === activeConversationId)
  const lastMsg = activeConv?.messages[activeConv.messages.length - 1]
  const isThinking = isStreaming
    && lastMsg?.role === 'assistant'
    && !!lastMsg?.statusText
    && !lastMsg?.content

  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wanderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const walkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const postStreamTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const floatRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(pos)
  const petWanderRef = useRef(petWander)
  const isStreamingRef = useRef(false)
  const dragState = useRef<{
    startMouseX: number; startMouseY: number
    startBottom: number; startRight: number
    moved: boolean; downTime: number
  } | null>(null)

  useEffect(() => { petWanderRef.current = petWander }, [petWander])

  const setPosTracked = useCallback((p: { bottom: number; right: number }) => {
    posRef.current = p
    setPos(p)
  }, [])

  useEffect(() => {
    localStorage.setItem(SAVED_POS_KEY, JSON.stringify(pos))
  }, [pos])

  const stopWalking = useCallback(() => {
    if (walkIntervalRef.current) { clearInterval(walkIntervalRef.current); walkIntervalRef.current = null }
    setSpriteState('idle')
  }, [])

  const scheduleWander = useCallback(() => {
    if (wanderTimer.current) clearTimeout(wanderTimer.current)
    wanderTimer.current = setTimeout(() => {
      if (!petWanderRef.current || isStreamingRef.current) return
      if (Math.random() < 0.3) { scheduleWander(); return }

      const el = floatRef.current
      const parent = el?.parentElement
      if (!parent) { scheduleWander(); return }

      const petH = el.clientHeight || PET_WIDTH
      const maxRight = Math.max(0, parent.clientWidth - PET_WIDTH)
      const maxBottom = Math.max(0, parent.clientHeight - petH)
      const cur = posRef.current

      let targetRight = Math.random() * maxRight
      const targetBottom = Math.max(0, Math.min(maxBottom, cur.bottom + (Math.random() - 0.5) * 100))
      if (Math.abs(targetRight - cur.right) < 60 && Math.abs(targetBottom - cur.bottom) < 30) {
        targetRight = maxRight - cur.right
      }
      const target = { right: targetRight, bottom: targetBottom }
      const dir: CodexState = target.right < cur.right ? 'runR' : 'runL'
      setSpriteState(dir)

      walkIntervalRef.current = setInterval(() => {
        if (!petWanderRef.current || isStreamingRef.current) {
          if (walkIntervalRef.current) { clearInterval(walkIntervalRef.current); walkIntervalRef.current = null }
          setSpriteState('idle')
          return
        }
        const c = posRef.current
        const dx = target.right - c.right
        const dy = target.bottom - c.bottom
        const dist = Math.hypot(dx, dy)
        if (dist <= WALK_SPEED) {
          setPosTracked(target)
          if (walkIntervalRef.current) { clearInterval(walkIntervalRef.current); walkIntervalRef.current = null }
          setSpriteState('idle')
          scheduleWander()
          return
        }
        const ratio = WALK_SPEED / dist
        setPosTracked({ right: c.right + dx * ratio, bottom: c.bottom + dy * ratio })
      }, WALK_TICK_MS)
    }, 5000 + Math.random() * 10000)
  }, [setPosTracked])

  // Start/stop wander when pet appears or petWander setting changes
  useEffect(() => {
    if (!pet) return
    if (!petWander) {
      if (wanderTimer.current) { clearTimeout(wanderTimer.current); wanderTimer.current = null }
      stopWalking()
      return
    }
    if (!isStreamingRef.current) scheduleWander()
    return () => {
      if (wanderTimer.current) { clearTimeout(wanderTimer.current); wanderTimer.current = null }
      if (walkIntervalRef.current) { clearInterval(walkIntervalRef.current); walkIntervalRef.current = null }
    }
  }, [!!pet, petWander]) // eslint-disable-line react-hooks/exhaustive-deps

  // React to streaming start/end
  useEffect(() => {
    if (!pet) return
    if (isStreaming) {
      if (postStreamTimer.current) { clearTimeout(postStreamTimer.current); postStreamTimer.current = null }
      if (wanderTimer.current) { clearTimeout(wanderTimer.current); wanderTimer.current = null }
      if (walkIntervalRef.current) { clearInterval(walkIntervalRef.current); walkIntervalRef.current = null }
      isStreamingRef.current = true
      setSpriteState(isThinking ? 'review' : 'running')
    } else if (isStreamingRef.current) {
      isStreamingRef.current = false
      setSpriteState('waving')
      postStreamTimer.current = setTimeout(() => {
        postStreamTimer.current = null
        setSpriteState('idle')
        if (petWanderRef.current) scheduleWander()
      }, 1200)
    }
  }, [isStreaming, pet]) // eslint-disable-line react-hooks/exhaustive-deps

  // Switch between review (thinking) and running (generating) while streaming
  useEffect(() => {
    if (!isStreaming || !pet) return
    setSpriteState(isThinking ? 'review' : 'running')
  }, [isThinking]) // eslint-disable-line react-hooks/exhaustive-deps

  const showMessage = useCallback((text: string) => {
    if (msgTimer.current) clearTimeout(msgTimer.current)
    setMessage(text)
    msgTimer.current = setTimeout(() => setMessage(null), 2500)
  }, [])

  const triggerJump = useCallback(() => {
    if (jumping) return
    setJumping(true)
    if (jumpTimer.current) clearTimeout(jumpTimer.current)
    jumpTimer.current = setTimeout(() => setJumping(false), 500)
  }, [jumping])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    stopWalking()
    if (wanderTimer.current) { clearTimeout(wanderTimer.current); wanderTimer.current = null }
    if (postStreamTimer.current) { clearTimeout(postStreamTimer.current); postStreamTimer.current = null }

    dragState.current = {
      startMouseX: e.clientX, startMouseY: e.clientY,
      startBottom: posRef.current.bottom, startRight: posRef.current.right,
      moved: false, downTime: Date.now(),
    }

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return
      const dx = ev.clientX - dragState.current.startMouseX
      const dy = ev.clientY - dragState.current.startMouseY
      if (Math.hypot(dx, dy) > 4) dragState.current.moved = true
      const el = floatRef.current
      const parent = el?.parentElement
      const petH = el?.clientHeight ?? PET_WIDTH
      const maxRight = parent ? Math.max(0, parent.clientWidth - PET_WIDTH) : 9999
      const maxBottom = parent ? Math.max(0, parent.clientHeight - petH) : 9999
      setPosTracked({
        bottom: Math.max(0, Math.min(maxBottom, dragState.current.startBottom - dy)),
        right:  Math.max(0, Math.min(maxRight,  dragState.current.startRight  - dx)),
      })
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      if (!dragState.current) return
      const wasClick = !dragState.current.moved && Date.now() - dragState.current.downTime < 300
      dragState.current = null
      if (wasClick) {
        triggerJump()
        showMessage(CLICK_MESSAGES[Math.floor(Math.random() * CLICK_MESSAGES.length)])
      }
      if (!isStreamingRef.current && petWanderRef.current) scheduleWander()
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [stopWalking, scheduleWander, setPosTracked, triggerJump, showMessage])

  if (!pet) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: pos.bottom,
        right: pos.right,
        zIndex: 40,
        userSelect: 'none',
        cursor: 'grab',
      }}
      ref={floatRef}
      onMouseDown={handleMouseDown}
    >
      {message && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 6,
          background: 'var(--popover)',
          border: '1px solid var(--border)',
          color: 'var(--popover-foreground)',
          padding: '3px 9px',
          borderRadius: '10px',
          fontSize: '11px',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
        }}>
          {message}
        </div>
      )}
      <CodexSprite
        spritesheetUrl={pet.spritesheetUrl}
        state={spriteState}
        jumping={jumping}
        displayWidth={PET_WIDTH}
      />
    </div>
  )
}
