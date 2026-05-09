import { useState, useEffect } from 'react'

interface PetCharacterProps {
  jumping?: boolean
}

export default function PetCharacter({ jumping = false }: PetCharacterProps): JSX.Element {
  const [blinking, setBlinking] = useState(false)

  useEffect(() => {
    let tid: ReturnType<typeof setTimeout>
    const scheduleBlink = () => {
      tid = setTimeout(() => {
        setBlinking(true)
        setTimeout(() => setBlinking(false), 160)
        scheduleBlink()
      }, 3000 + Math.random() * 4000)
    }
    scheduleBlink()
    return () => clearTimeout(tid)
  }, [])

  const eyeRY = blinking ? 1.5 : 12

  return (
    <>
      <svg
        viewBox="0 0 160 162"
        width="160"
        height="162"
        style={{
          display: 'block',
          cursor: 'grab',
          animation: jumping
            ? 'petJump 0.5s cubic-bezier(0.36,0.07,0.19,0.97)'
            : 'petBob 2.4s ease-in-out infinite',
          userSelect: 'none',
          overflow: 'visible',
        }}
      >
        {/* Ground shadow */}
        <ellipse cx="80" cy="157" rx="46" ry="6" fill="rgba(0,0,0,0.12)" />

        {/* Tail */}
        <path
          d="M 108 140 Q 145 118 148 90 Q 151 60 128 50"
          stroke="#e8952f"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
          style={{
            animation: 'tailWag 2s ease-in-out infinite',
            transformOrigin: '108px 140px',
          }}
        />

        {/* Body */}
        <ellipse cx="80" cy="116" rx="43" ry="38" fill="#f5a623" />

        {/* Belly */}
        <ellipse cx="80" cy="118" rx="27" ry="25" fill="#ffc659" />

        {/* Front paws */}
        <ellipse cx="51" cy="151" rx="17" ry="10" fill="#f5a623" />
        <ellipse cx="109" cy="151" rx="17" ry="10" fill="#f5a623" />
        <path d="M 44 154 Q 51 157 58 154" stroke="#d4871c" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M 102 154 Q 109 157 116 154" stroke="#d4871c" strokeWidth="1.2" fill="none" strokeLinecap="round" />

        {/* Head */}
        <circle cx="80" cy="70" r="44" fill="#f5a623" />

        {/* Ear outer */}
        <polygon points="40,44 25,8 58,36" fill="#f5a623" />
        <polygon points="120,44 135,8 102,36" fill="#f5a623" />
        {/* Ear inner */}
        <polygon points="41,41 31,16 55,36" fill="#ffb3c1" />
        <polygon points="119,41 129,16 105,36" fill="#ffb3c1" />

        {/* Eyes */}
        <ellipse cx="60" cy="68" rx="11" ry={eyeRY} fill="#1a1a2e" />
        <ellipse cx="100" cy="68" rx="11" ry={eyeRY} fill="#1a1a2e" />
        {!blinking && (
          <>
            <circle cx="64" cy="64" r="4" fill="white" />
            <circle cx="104" cy="64" r="4" fill="white" />
            <circle cx="58" cy="71" r="1.5" fill="white" />
            <circle cx="98" cy="71" r="1.5" fill="white" />
          </>
        )}

        {/* Cheek blush */}
        <ellipse cx="44" cy="79" rx="11" ry="7" fill="rgba(255,140,140,0.22)" />
        <ellipse cx="116" cy="79" rx="11" ry="7" fill="rgba(255,140,140,0.22)" />

        {/* Nose */}
        <ellipse cx="80" cy="83" rx="5.5" ry="4" fill="#ff9999" />

        {/* Mouth */}
        <path d="M 74 89 Q 80 95 86 89" stroke="#cc7070" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* Whiskers left */}
        <line x1="8" y1="80" x2="66" y2="84" stroke="#9b7a14" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="8" y1="88" x2="66" y2="88" stroke="#9b7a14" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="8" y1="96" x2="66" y2="92" stroke="#9b7a14" strokeWidth="1.2" strokeLinecap="round" />
        {/* Whiskers right */}
        <line x1="152" y1="80" x2="94" y2="84" stroke="#9b7a14" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="152" y1="88" x2="94" y2="88" stroke="#9b7a14" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="152" y1="96" x2="94" y2="92" stroke="#9b7a14" strokeWidth="1.2" strokeLinecap="round" />
      </svg>

      <style>{`
        @keyframes petBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes petJump {
          0%   { transform: translateY(0) scaleX(1) scaleY(1); }
          20%  { transform: translateY(-28px) scaleX(0.88) scaleY(1.12); }
          55%  { transform: translateY(0) scaleX(1.12) scaleY(0.88); }
          75%  { transform: translateY(-10px) scaleX(0.95) scaleY(1.05); }
          100% { transform: translateY(0) scaleX(1) scaleY(1); }
        }
        @keyframes tailWag {
          0%, 100% { transform: rotate(-14deg); }
          50%       { transform: rotate(14deg); }
        }
      `}</style>
    </>
  )
}
