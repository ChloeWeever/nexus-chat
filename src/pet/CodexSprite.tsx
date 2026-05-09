import { useState, useEffect, useRef } from 'react'

// Standard Codex/Petdex spritesheet layout: 8 columns × 9 rows
const COLS = 8
const ROWS = 9

const STATES = {
  idle:    { row: 0, frames: 6, fps: 7 },
  runR:    { row: 1, frames: 8, fps: 12 },
  runL:    { row: 2, frames: 8, fps: 12 },
  waving:  { row: 3, frames: 4, fps: 8 },
  jumping: { row: 4, frames: 5, fps: 10 },
  failed:  { row: 5, frames: 8, fps: 8 },
  waiting: { row: 6, frames: 6, fps: 5 },
  running: { row: 7, frames: 6, fps: 10 },
  review:  { row: 8, frames: 6, fps: 7 },
} as const

export type CodexState = keyof typeof STATES

interface CodexSpriteProps {
  spritesheetUrl: string
  state?: CodexState
  displayWidth?: number
  jumping?: boolean
}

export default function CodexSprite({
  spritesheetUrl,
  state = 'idle',
  displayWidth = 150,
  jumping = false,
}: CodexSpriteProps): JSX.Element {
  const [frame, setFrame] = useState(0)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const activeState = jumping ? 'jumping' : state

  useEffect(() => {
    const img = new Image()
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = spritesheetUrl
  }, [spritesheetUrl])

  useEffect(() => {
    setFrame(0)
    const anim = STATES[activeState]
    const interval = setInterval(
      () => setFrame((f) => (f + 1) % anim.frames),
      Math.round(1000 / anim.fps)
    )
    return () => clearInterval(interval)
  }, [activeState])

  if (!imgSize) {
    return <div style={{ width: displayWidth, height: displayWidth }} />
  }

  const frameW = imgSize.w / COLS
  const frameH = imgSize.h / ROWS
  const scale = displayWidth / frameW
  const displayH = Math.round(frameH * scale)
  const bgW = Math.round(imgSize.w * scale)
  const bgH = Math.round(imgSize.h * scale)
  const bgX = -(frame * displayWidth)
  const bgY = -(STATES[activeState].row * displayH)

  return (
    <div
      style={{
        width: displayWidth,
        height: displayH,
        backgroundImage: `url(${spritesheetUrl})`,
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundRepeat: 'no-repeat',
        cursor: 'grab',
        userSelect: 'none',
      }}
    />
  )
}
